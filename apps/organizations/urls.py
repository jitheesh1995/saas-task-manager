from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.organizations.views import (
    OrganisationViewSet,
    WorkspaceMembersView,
    WorkspaceMemberAddView,
    WorkspaceMemberRoleView,
    WorkspaceMemberRemoveView,
    activity_feed,
)

router = DefaultRouter()
router.register(r"organisations", OrganisationViewSet, basename="organisation")

urlpatterns = [
    path("activity/", activity_feed),
    path("workspaces/<uuid:workspace_id>/members/", WorkspaceMembersView.as_view()),
    path("workspaces/<uuid:workspace_id>/members/add", WorkspaceMemberAddView.as_view()),
    path("workspaces/<uuid:workspace_id>/members/<uuid:member_id>/role", WorkspaceMemberRoleView.as_view()),
    path("workspaces/<uuid:workspace_id>/members/<uuid:member_id>", WorkspaceMemberRemoveView.as_view()),
]
urlpatterns += router.urls
