from django.core.management.base import BaseCommand
from apps.organizations.models import Activity


class Command(BaseCommand):
    help = "Insert demo activity records for the dashboard."

    def handle(self, *args, **options):
        entries = [
            {
                "actor_name": "John",
                "action": "created task",
                "target_title": "Setup CI pipeline",
            },
            {
                "actor_name": "Anna",
                "action": "moved task to In Progress",
                "target_title": "Payment Integration",
            },
            {
                "actor_name": "Mike",
                "action": "completed task",
                "target_title": "Landing Page UI",
            },
        ]

        records = [
            Activity(
                actor_name=item["actor_name"],
                action=item["action"],
                target_title=item["target_title"],
                org_id="demo-org",
            )
            for item in entries
        ]

        Activity.objects.bulk_create(records)
        self.stdout.write(self.style.SUCCESS(f"Inserted {len(records)} demo activity records."))
