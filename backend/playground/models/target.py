from django.db import models

from playground.choices import PlaygroundModeChoices


class PlaygroundTarget(models.Model):
    """A public test endpoint whose behaviour is switched from the UI."""

    slug = models.SlugField(max_length=40, unique=True)
    mode = models.CharField(max_length=20, choices=PlaygroundModeChoices.choices)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("id",)

    def __str__(self) -> str:
        return f"{self.slug} ({self.mode})"
