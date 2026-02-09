from django.http import JsonResponse
from apps.organizations.models import OrganisationMember
from rest_framework_simplejwt.authentication import JWTAuthentication


class TenantMiddleware:
    SKIP_PATHS = [
        "/api/auth/login/",
        "/api/auth/register/",
        "/api/auth/refresh/",
        "/api/auth/me/",
        "/health/",
        "/admin/"
    ]
    TENANT_OPTIONAL_PATHS = [
        "/api/organisations/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
    
        # 1. Skip auth and system paths
        for skip_path in self.SKIP_PATHS:
            if path.startswith(skip_path):
                return self.get_response(request)

        # 2. Ensure JWT auth is applied before checking user
        if not request.user.is_authenticated:
            try:
                jwt_auth = JWTAuthentication()
                user_auth_tuple = jwt_auth.authenticate(request)
                if user_auth_tuple is not None:
                    request.user, request.auth = user_auth_tuple
            except Exception:
                pass

        # 3. Require authentication
        if not request.user.is_authenticated:
            return JsonResponse(
                {"detail": "Authentication required."},
                status=401
            )

        # 4. Allow tenant-optional paths (still require auth)
        for optional_path in self.TENANT_OPTIONAL_PATHS:
            if path.startswith(optional_path):
                request.tenant = None
                request.tenant_role = None
                return self.get_response(request)

        # 5. Require tenant header
        org_id = request.headers.get("X-ORG-ID")
        if not org_id:
            return JsonResponse(
                {"detail": "X-ORG-ID header is required."},
                status=400
            )

        # 6. Validate membership
        try:
            membership = OrganisationMember.objects.select_related("organisation").get(
                user=request.user,
                organisation_id=org_id
            )
        except OrganisationMember.DoesNotExist:
            return JsonResponse(
                {"detail": "Invalid organization or access denied."},
                status=403
            )

        # 5. Attach tenant context
        request.tenant = membership.organisation
        request.tenant_role = membership.role

        return self.get_response(request)
