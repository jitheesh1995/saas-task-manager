# apps/projects/models.py
import uuid
from django.db import models
from apps.organizations.models import Organisation

class Project(models.Model):
    """
    Represents a project within an organisation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "projects"
        unique_together = ("organisation", "name")
        indexes = [
            models.Index(fields=["organisation", "created_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.organisation.name})"
