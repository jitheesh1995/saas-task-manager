from rest_framework.exceptions import PermissionDenied


class TenantScopedViewSetMixin:
    """
    Enforces tenant presence and provides helper filtering by tenant.
    """
    require_tenant = True

    def ensure_tenant(self):
        if self.require_tenant and getattr(self.request, "tenant", None) is None:
            raise PermissionDenied("Active tenant is required.")

    def filter_queryset_by_tenant(self, queryset):
        tenant = getattr(self.request, "tenant", None)
        if tenant is None:
            return queryset

        if hasattr(queryset.model, "organisation_id"):
            return queryset.filter(organisation_id=tenant.id)
        if hasattr(queryset.model, "project_id"):
            return queryset.filter(project__organisation_id=tenant.id)
        return queryset
