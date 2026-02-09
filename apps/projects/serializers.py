from rest_framework import serializers
from apps.projects.models import Project

class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project model.
    Converts Project objects <-> JSON for API requests/responses.
    """
    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["organisation"]  # tenant context enforced in viewset