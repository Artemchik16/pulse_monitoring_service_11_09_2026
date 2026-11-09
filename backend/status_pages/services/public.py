from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from monitors.choices import MonitorStatusChoices
from stats.repositories import CheckStatsRepository
from stats.services.series import uptime_pct
from status_pages import constants
from status_pages.models import StatusPage
from status_pages.repositories import StatusPageRepository


def public_cache_key(slug: str) -> str:
    return f"status-page:public:{slug}"


class PublicStatusPageService:
    """Anonymous view of a status page: only what is safe to show to anyone."""

    def __init__(self) -> None:
        self._status_page_repository = StatusPageRepository()
        self._check_stats_repository = CheckStatsRepository()

    def get(self, *, slug: str) -> dict[str, Any] | None:
        """Public snapshot of the page, or None if there is no such page."""

        cached = cache.get(public_cache_key(slug))
        if cached is not None:
            return cached
        page = self._status_page_repository.find_by_slug(slug=slug)
        if page is None:
            return None
        snapshot = self._build(page=page)
        cache.set(public_cache_key(slug), snapshot, timeout=constants.PUBLIC_CACHE_TTL_SEC)
        return snapshot

    def _build(self, *, page: StatusPage) -> dict[str, Any]:
        monitors = self._status_page_repository.list_public_monitors(page=page)
        ids = [monitor.id for monitor in monitors]
        now = timezone.now()
        uptime = {
            days: self._check_stats_repository.uptime_for_monitors(
                monitor_ids=ids, since=now - timedelta(days=days)
            )
            if ids
            else {}
            for days in constants.PUBLIC_UPTIME_WINDOWS_DAYS
        }

        def uptime_over(days: int, monitor_id: int) -> float | None:
            total, succeeded = uptime[days].get(monitor_id, (0, 0))
            return uptime_pct(succeeded, total)

        # Whitelist of fields: no URL, method, ids, error texts or owner data ever leave the server
        items = [
            {
                "name": monitor.name,
                "status": monitor.status,
                "uptime_24h": uptime_over(1, monitor.id),
                "uptime_30d": uptime_over(30, monitor.id),
                "last_checked_at": monitor.last_checked_at,
            }
            for monitor in monitors
        ]
        return {
            "title": page.title,
            "slug": page.slug,
            "status": self._overall_status(items),
            "generated_at": now,
            "monitors": items,
        }

    @staticmethod
    def _overall_status(items: list[dict[str, Any]]) -> str:
        watched = [item for item in items if item["status"] != MonitorStatusChoices.PAUSED]
        down = sum(item["status"] == MonitorStatusChoices.DOWN for item in watched)
        if not watched:
            return "unknown"
        if down == 0:
            return "operational"
        return "major_outage" if down == len(watched) else "partial_outage"
