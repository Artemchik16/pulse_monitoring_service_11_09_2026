from django.db.models import QuerySet

from playground.models import PlaygroundTarget


class PlaygroundTargetRepository:
    """PlaygroundTarget database operations."""

    def list_all(self) -> QuerySet[PlaygroundTarget]:
        return PlaygroundTarget.objects.all()

    def get_by_slug(self, *, slug: str) -> PlaygroundTarget:
        return PlaygroundTarget.objects.get(slug=slug)

    def find_mode(self, *, slug: str) -> str | None:
        return PlaygroundTarget.objects.filter(slug=slug).values_list("mode", flat=True).first()

    def set_mode(self, *, target: PlaygroundTarget, mode: str) -> PlaygroundTarget:
        target.mode = mode
        target.save(update_fields=("mode", "updated_at"))
        return target
