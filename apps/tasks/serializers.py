from rest_framework import serializers
from apps.tasks.models import Task

class TaskSerializer(serializers.ModelSerializer):
    """
    Converts Task model <-> JSON for API.
    """
    class Meta:
        model = Task
        fields = "__all__"
        read_only_fields = []  # project provided by client, validated in viewset
