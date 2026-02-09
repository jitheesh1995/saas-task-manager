# apps/organisations/models.py
import uuid
from django.db import models
from django.conf import settings


class Organisation(models.Model):
    """
    Represents a tenant (company).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_organisations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organisations"
        indexes = [
            models.Index(fields=["owner"]),
            models.Index(fields=["domain"]),
        ]

    def __str__(self):
        return self.name


class OrganisationMember(models.Model):
    """
    Links a user to an organisation with a role.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.CASCADE,
        related_name="members",
    )
    role = models.CharField(
        max_length=50,
        choices=[
            ("owner", "Owner"),
            ("admin", "Admin"),
            ("member", "Member"),
            ("viewer", "Viewer"),
        ],
        default="member"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organisation_members"
        unique_together = ("user", "organisation")
        indexes = [
            models.Index(fields=["organisation", "user"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.email} in {self.organisation.name} as {self.role}"


class Activity(models.Model):
    """
    Human-readable activity feed entry.
    """
    actor_name = models.CharField(max_length=255)
    action = models.CharField(max_length=255)
    target_title = models.CharField(max_length=255)
    org_id = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activities"
        indexes = [
            models.Index(fields=["org_id", "created_at"]),
        ]

    def __str__(self):
        return f"{self.actor_name} {self.action} {self.target_title}"


class AuditEvent(models.Model):
    """
    Minimal audit log for sensitive changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_events",
    )
    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.CASCADE,
        related_name="audit_events",
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_events"
        indexes = [
            models.Index(fields=["organisation", "created_at"]),
            models.Index(fields=["action"]),
        ]
