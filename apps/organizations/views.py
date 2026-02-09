from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.template.response import TemplateResponse
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.organizations.models import Organisation, OrganisationMember, Activity, AuditEvent
from apps.organizations.serializers import (
    OrganisationSerializer,
    OrganisationMemberSerializer,
    AddMemberSerializer,
    RoleUpdateSerializer,
)
from apps.organizations.activity import log_activity
from core.permissions import IsOrganisationOwner

User = get_user_model()

class OrganisationViewSet(viewsets.ModelViewSet):
    """
    Tenant-aware Organisation API.
    """
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated, IsOrganisationOwner]

    def get_permissions(self):
        if self.action in ["list", "create", "retrieve"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        """
        DRF built-in hook:
        - Defines which organisations the user can see.
        - Tenant isolation: only organisations the user belongs to.
        """
        return Organisation.objects.filter(members__user=self.request.user)

    def perform_create(self, serializer):
        """
        DRF built-in hook:
        - Called when creating a new organisation.
        - Attach current user as owner automatically.
        """
        with transaction.atomic():
            organisation = serializer.save(owner=self.request.user)
            OrganisationMember.objects.create(
                user=self.request.user,
                organisation=organisation,
                role="owner",
            )
            AuditEvent.objects.create(
                actor=self.request.user,
                organisation=organisation,
                action="organisation.created",
                target_type="organisation",
                target_id=organisation.id,
                metadata={"name": organisation.name},
            )
            log_activity(
                self.request.user,
                "created organization",
                organisation.name,
                organisation.id,
            )


def activity_feed(request):
    """
    Render the activity feed for the active organization.
    """
    request.org_id = getattr(request, "org_id", None) or request.headers.get("X-ORG-ID")
    if not request.org_id:
        return JsonResponse({"detail": "X-ORG-ID header is required."}, status=400)

    activities = Activity.objects.filter(org_id=request.org_id).order_by("-created_at")[:20]
    return TemplateResponse(request, "organizations/activity_list.html", {"activities": activities})




class WorkspaceMembersView(APIView):
    """
    List members for a workspace.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        if getattr(request, "tenant", None) is None:
            return Response({"detail": "Active tenant is required."}, status=status.HTTP_400_BAD_REQUEST)
        if str(request.tenant.id) != str(workspace_id):
            return Response({"detail": "Workspace mismatch."}, status=status.HTTP_403_FORBIDDEN)

        members = OrganisationMember.objects.select_related("user").filter(organisation=request.tenant)
        data = OrganisationMemberSerializer(members, many=True).data
        return Response({"members": data}, status=status.HTTP_200_OK)


class WorkspaceMemberAddView(APIView):
    """
    Add a member to a workspace. Only owner/admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id):
        if getattr(request, "tenant", None) is None:
            return Response({"detail": "Active tenant is required."}, status=status.HTTP_400_BAD_REQUEST)
        if str(request.tenant.id) != str(workspace_id):
            return Response({"detail": "Workspace mismatch."}, status=status.HTTP_403_FORBIDDEN)

        if getattr(request, "tenant_role", None) not in ["owner", "admin"]:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if OrganisationMember.objects.filter(user=user, organisation=request.tenant).exists():
            return Response({"detail": "User is already a member."}, status=status.HTTP_400_BAD_REQUEST)

        member = OrganisationMember.objects.create(
            user=user,
            organisation=request.tenant,
            role=role,
        )

        log_activity(
            request.user,
            "added member",
            user.email,
            request.tenant.id,
        )

        return Response(
            {"member": OrganisationMemberSerializer(member).data},
            status=status.HTTP_201_CREATED,
        )


class WorkspaceMemberRoleView(APIView):
    """
    Owner-only role updates.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, workspace_id, member_id):
        if getattr(request, "tenant", None) is None:
            return Response({"detail": "Active tenant is required."}, status=status.HTTP_400_BAD_REQUEST)
        if str(request.tenant.id) != str(workspace_id):
            return Response({"detail": "Workspace mismatch."}, status=status.HTTP_403_FORBIDDEN)

        if getattr(request, "tenant_role", None) != "owner":
            return Response({"detail": "Only owners can change roles."}, status=status.HTTP_403_FORBIDDEN)

        serializer = RoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]

        member = OrganisationMember.objects.select_related("user").filter(
            organisation=request.tenant,
            id=member_id
        ).first()
        if not member:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

        if member.role == "owner":
            return Response({"detail": "Owner role cannot be changed."}, status=status.HTTP_400_BAD_REQUEST)

        member.role = role
        member.save(update_fields=["role"])

        log_activity(
            request.user,
            f"changed role to {role}",
            member.user.email,
            request.tenant.id,
        )

        return Response(
            {"member": OrganisationMemberSerializer(member).data},
            status=status.HTTP_200_OK,
        )


class WorkspaceMemberRemoveView(APIView):
    """
    Owner or admin can remove members. Admin cannot remove owners.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, workspace_id, member_id):
        if getattr(request, "tenant", None) is None:
            return Response({"detail": "Active tenant is required."}, status=status.HTTP_400_BAD_REQUEST)
        if str(request.tenant.id) != str(workspace_id):
            return Response({"detail": "Workspace mismatch."}, status=status.HTTP_403_FORBIDDEN)

        role = getattr(request, "tenant_role", None)
        if role not in ["owner", "admin"]:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        member = OrganisationMember.objects.select_related("user").filter(
            organisation=request.tenant,
            id=member_id
        ).first()
        if not member:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

        if member.role == "owner":
            return Response({"detail": "Owner cannot be removed."}, status=status.HTTP_400_BAD_REQUEST)

        if role == "admin" and member.role == "owner":
            return Response({"detail": "Admins cannot remove owners."}, status=status.HTTP_403_FORBIDDEN)

        target_email = member.user.email
        member.delete()

        log_activity(
            request.user,
            "removed member",
            target_email,
            request.tenant.id,
        )
        return Response({"detail": "Member removed."}, status=status.HTTP_200_OK)

