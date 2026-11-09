from django.contrib import admin

from monitors.models import Monitor


@admin.register(Monitor)
class MonitorAdmin(admin.ModelAdmin):
    """Admin for monitors."""

    list_display = ("name", "owner", "url", "status", "is_active", "is_public", "last_checked_at")
    list_filter = ("status", "is_active", "is_public", "method")
    search_fields = ("name", "url", "owner__email")
    raw_id_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at", "last_checked_at", "next_check_at")
