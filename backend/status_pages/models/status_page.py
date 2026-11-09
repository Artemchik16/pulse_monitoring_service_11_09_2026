from django.conf import settings
from django.db import models

from status_pages import constants


class StatusPage(models.Model):
    """Public page showing the state of monitors chosen by the owner."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="status_pages"
    )
    slug = models.SlugField(max_length=constants.SLUG_MAX_LENGTH, unique=True)
    title = models.CharField(max_length=constants.TITLE_MAX_LENGTH)
    monitors = models.ManyToManyField("monitors.Monitor", related_name="status_pages", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")

    def __str__(self) -> str:
        return self.slug
