from django.http import JsonResponse
from organizations.models import OrganizationMember


class TenantMiddleware:
    SKIP_PATHS = [
        "/api/auth/login/",
        "/api/auth/register/",
        "/api/auth/refresh/",
        "/health/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # 1. Skip auth and system paths
        for skip_path in self.SKIP_PATHS:
            if path.startswith(skip_path):
                return self.get_response(request)

        # 2. Require authentication
        if not request.user.is_authenticated:
            return JsonResponse(
                {"detail": "Authentication required."},
                status=401
            )

        # 3. Require tenant header
        org_id = request.headers.get("X-ORG-ID")
        if not org_id:
            return JsonResponse(
                {"detail": "X-ORG-ID header is required."},
                status=400
            )

        # 4. Validate membership
        try:
            membership = OrganizationMember.objects.select_related("organization").get(
                user=request.user,
                organization_id=org_id
            )
        except (OrganizationMember.DoesNotExist, ValueError):
            return JsonResponse(
                {"detail": "Invalid organization or access denied."},
                status=403
            )

        # 5. Attach tenant context
        request.org = membership.organization
        request.role = membership.role

        return self.get_response(request)
