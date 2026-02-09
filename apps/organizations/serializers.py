from rest_framework import serializers
from apps.organizations.models import Organisation, OrganisationMember

class OrganisationSerializer(serializers.ModelSerializer):
    """
    Serializer for Organisation model.
    Converts Organisation objects <-> JSON.
    """
    class Meta:
        model = Organisation
        fields = "__all__"
        read_only_fields = ["owner"]  # owner set automatically, not by client


class OrganisationMemberSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = OrganisationMember
        fields = ["id", "name", "email", "role", "joined_at"]

    def get_name(self, obj):
        first = obj.user.first_name or ""
        last = obj.user.last_name or ""
        full = f"{first} {last}".strip()
        return full or obj.user.email.split("@")[0]


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["admin", "member", "viewer"])


class RoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["admin", "member", "viewer"])
