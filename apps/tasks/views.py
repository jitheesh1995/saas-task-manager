from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.organizations.activity import log_activity
from core.permissions import IsMember, IsAdminOrOwner
from core.tenancy import TenantScopedViewSetMixin

class TaskViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Tenant-aware Task API.
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsMember]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated(), IsAdminOrOwner()]
        return super().get_permissions()

    def get_queryset(self):
        # DRF built-in hook: defines what data is returned
        self.ensure_tenant()
        return self.filter_queryset_by_tenant(Task.objects.all())

    def perform_create(self, serializer):
        # DRF built-in hook: called when saving new objects
        self.ensure_tenant()
        project = serializer.validated_data.get("project")
        if project.organisation_id != self.request.tenant.id:
            raise PermissionDenied("Project does not belong to the active organisation.")
        task = serializer.save()
        log_activity(
            self.request.user,
            "created task",
            task.title,
            self.request.tenant.id,
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        self.ensure_tenant()
        task = self.get_object()
        raw_status = request.data.get("status")
        if not raw_status:
            return Response({"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST)

        normalized = str(raw_status).strip().lower()
        allowed = ["todo", "in_progress", "done"]
        if normalized not in allowed:
            return Response(
                {"detail": "Invalid status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.status = normalized
        task.save(update_fields=["status"])

        if normalized == "done":
            action = "completed task"
        elif normalized == "in_progress":
            action = "moved task to In Progress"
        else:
            action = "moved task to To Do"

        log_activity(
            request.user,
            action,
            task.title,
            request.tenant.id,
        )
        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

