from django.contrib import admin

from playground.models import PlaygroundTarget


@admin.register(PlaygroundTarget)
class PlaygroundTargetAdmin(admin.ModelAdmin):
    list_display = ("slug", "mode", "updated_at")
    list_editable = ("mode",)
