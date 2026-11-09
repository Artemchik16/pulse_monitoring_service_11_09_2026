from django.db.models import Prefetch, QuerySet

from monitors.models import Monitor
from status_pages.models import StatusPage


class StatusPageRepository:
    """StatusPage database operations."""

    def list_by_owner(self, *, owner_id: int) -> QuerySet[StatusPage]:
        """The owner's pages with their monitor ids prefetched."""

        return StatusPage.objects.filter(owner_id=owner_id).prefetch_related(
            Prefetch("monitors", queryset=Monitor.objects.only("id").order_by("name", "id"))
        )

    def get_by_id(self, *, page_id: int, owner_id: int) -> StatusPage:
        """Get the owner's page by ID."""

        return self.list_by_owner(owner_id=owner_id).get(id=page_id)

    def find_by_slug(self, *, slug: str) -> StatusPage | None:
        """Find a page by its public slug (any owner)."""

        return StatusPage.objects.filter(slug=slug).first()

    def list_public_monitors(self, *, page: StatusPage) -> list[Monitor]:
        """Monitors the page shows: chosen by the owner and still flagged public."""

        return list(page.monitors.filter(is_public=True).order_by("name", "id"))

    def count_by_owner(self, *, owner_id: int) -> int:
        return StatusPage.objects.filter(owner_id=owner_id).count()

    def exists_slug(self, *, slug: str, exclude_id: int | None = None) -> bool:
        return StatusPage.objects.filter(slug=slug).exclude(id=exclude_id).exists()

    def create(self, *, owner_id: int, title: str, slug: str, monitor_ids: list[int]) -> StatusPage:
        page = StatusPage.objects.create(owner_id=owner_id, title=title, slug=slug)
        page.monitors.set(monitor_ids)
        return page

    def update(
        self, *, page: StatusPage, title: str, slug: str, monitor_ids: list[int]
    ) -> StatusPage:
        page.title = title
        page.slug = slug
        page.save(update_fields=("title", "slug", "updated_at"))
        page.monitors.set(monitor_ids)
        return page

    def delete(self, *, page: StatusPage) -> None:
        page.delete()
