from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.projects.models import Project
from apps.projects.serializers import ProjectSerializer
from apps.organizations.activity import log_activity
from core.permissions import IsAdminOrOwner
from core.tenancy import TenantScopedViewSetMixin

class ProjectViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Tenant-aware Project API.
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwner]

    def get_queryset(self):
        """
        DRF built-in hook:
        - Defines which projects the user can see.
        - Tenant isolation: only projects belonging to the active organisation.
        """
        self.ensure_tenant()
        return self.filter_queryset_by_tenant(Project.objects.all())

    def perform_create(self, serializer):
        """
        DRF built-in hook:
        - Called when creating a new project.
        - Attach tenant automatically so clients can't spoof organisation IDs.
        """
        self.ensure_tenant()
        project = serializer.save(organisation=self.request.tenant)
        log_activity(
            self.request.user,
            "created project",
            project.name,
            self.request.tenant.id,
        )
