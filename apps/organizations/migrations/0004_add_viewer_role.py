from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0003_alter_organisation_domain"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organisationmember",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("admin", "Admin"),
                    ("member", "Member"),
                    ("viewer", "Viewer"),
                ],
                default="member",
                max_length=50,
            ),
        ),
    ]
