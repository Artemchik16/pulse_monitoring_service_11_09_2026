from django.contrib import admin

from checks.models import CheckResult


@admin.register(CheckResult)
class CheckResultAdmin(admin.ModelAdmin):
    """Read-only admin for check history."""

    list_display = ("monitor", "checked_at", "ok", "status_code", "response_time_ms", "error_code")
    list_filter = ("ok", "error_code")
    raw_id_fields = ("monitor",)
    date_hierarchy = "checked_at"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
