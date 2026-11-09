from django.contrib import admin

from incidents.models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    """Admin for incidents."""

    list_display = ("id", "monitor", "started_at", "resolved_at", "duration_sec", "cause_code")
    list_filter = ("cause_code",)
    raw_id_fields = ("monitor",)
    date_hierarchy = "started_at"
