from django.contrib import admin

from status_pages.models import StatusPage


@admin.register(StatusPage)
class StatusPageAdmin(admin.ModelAdmin):
    """Admin for status pages."""

    list_display = ("slug", "title", "owner", "created_at")
    search_fields = ("slug", "title", "owner__email")
    raw_id_fields = ("owner",)
    filter_horizontal = ("monitors",)
