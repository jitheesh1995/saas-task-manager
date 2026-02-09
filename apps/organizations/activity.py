from apps.organizations.models import Activity


def get_actor_name(user):
    if not user:
        return "Someone"
    first = getattr(user, "first_name", "") or ""
    last = getattr(user, "last_name", "") or ""
    full = f"{first} {last}".strip()
    if full:
        return full
    return getattr(user, "email", "Someone") or "Someone"


def log_activity(user, action, target_title, org_id):
    Activity.objects.create(
        actor_name=get_actor_name(user),
        action=action,
        target_title=target_title,
        org_id=str(org_id),
    )
