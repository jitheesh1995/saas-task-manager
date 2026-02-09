from django.contrib import admin
from .models import Organisation, OrganisationMember

# Register your models here.
admin.site.register(Organisation)
admin.site.register(OrganisationMember)
