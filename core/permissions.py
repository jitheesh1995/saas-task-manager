from rest_framework.permissions import BasePermission

def _matches_tenant(request, obj):
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return False

    if hasattr(obj, "organisation_id"):
        return obj.organisation_id == tenant.id
    if hasattr(obj, "project"):
        return getattr(obj.project, "organisation_id", None) == tenant.id
    return False

def _is_safe_method(request):
    return request.method in ["GET", "HEAD", "OPTIONS"]

class IsOwner(BasePermission):
    """
    Permission: Only organisation owners can perform the action.
    """
    def has_permission(self, request, view):
        # TenantMiddleware sets request.tenant_role
        return getattr(request, "tenant_role", None) == "owner"


class IsAdminOrOwner(BasePermission):
    """
    Permission: Admins and owners can perform the action.
    """
    def has_permission(self, request, view):
        role = getattr(request, "tenant_role", None)
        if _is_safe_method(request):
            return role in ["member", "admin", "owner", "viewer"]
        return role in ["admin", "owner"]

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view) and _matches_tenant(request, obj)


class IsMember(BasePermission):
    """
    Permission: Any member (owner, admin, member) can perform the action.
    """
    def has_permission(self, request, view):
        role = getattr(request, "tenant_role", None)
        if _is_safe_method(request):
            return role in ["member", "admin", "owner", "viewer"]
        return role in ["member", "admin", "owner"]

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view) and _matches_tenant(request, obj)


class IsOrganisationOwner(BasePermission):
    """
    Object-level permission: only the organisation owner can modify it.
    """
    def has_object_permission(self, request, view, obj):
        return getattr(obj, "owner_id", None) == getattr(request.user, "id", None)
