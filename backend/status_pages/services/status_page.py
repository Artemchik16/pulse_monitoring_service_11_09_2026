from django.core.cache import cache
from django.db import IntegrityError, transaction

from monitors.repositories import MonitorRepository
from status_pages.constants import MAX_PAGES_PER_USER
from status_pages.exceptions import SlugTaken, StatusPageLimitReached, UnknownMonitors
from status_pages.models import StatusPage
from status_pages.repositories import StatusPageRepository
from status_pages.services.public import public_cache_key
from users.repositories import UserRepository


class StatusPageService:
    """Owner-side management of status pages."""

    def __init__(self) -> None:
        self._status_page_repository = StatusPageRepository()
        self._monitor_repository = MonitorRepository()
        self._user_repository = UserRepository()

    def create(self, *, owner_id: int, title: str, slug: str, monitor_ids: list[int]) -> StatusPage:
        """Create a page within the per-user quota."""

        self._ensure_owned(owner_id=owner_id, monitor_ids=monitor_ids)
        try:
            with transaction.atomic():
                # Owner row lock: concurrent creates cannot both pass the quota check
                self._user_repository.lock_by_id(user_id=owner_id)
                if (
                    self._status_page_repository.count_by_owner(owner_id=owner_id)
                    >= MAX_PAGES_PER_USER
                ):
                    raise StatusPageLimitReached()
                if self._status_page_repository.exists_slug(slug=slug):
                    raise SlugTaken()
                return self._status_page_repository.create(
                    owner_id=owner_id, title=title, slug=slug, monitor_ids=monitor_ids
                )
        except IntegrityError:
            # Same slug taken by a concurrent request
            raise SlugTaken() from None

    def update(
        self, *, page: StatusPage, owner_id: int, title: str, slug: str, monitor_ids: list[int]
    ) -> StatusPage:
        """Replace title, slug and monitor selection; the public cache is dropped."""

        self._ensure_owned(owner_id=owner_id, monitor_ids=monitor_ids)
        old_slug = page.slug
        if slug != old_slug and self._status_page_repository.exists_slug(
            slug=slug, exclude_id=page.id
        ):
            raise SlugTaken()
        try:
            with transaction.atomic():
                page = self._status_page_repository.update(
                    page=page, title=title, slug=slug, monitor_ids=monitor_ids
                )
        except IntegrityError:
            raise SlugTaken() from None
        cache.delete_many([public_cache_key(old_slug), public_cache_key(slug)])
        return page

    def delete(self, *, page: StatusPage) -> None:
        slug = page.slug
        self._status_page_repository.delete(page=page)
        cache.delete(public_cache_key(slug))

    def _ensure_owned(self, *, owner_id: int, monitor_ids: list[int]) -> None:
        owned = self._monitor_repository.filter_owned_ids(
            owner_id=owner_id, monitor_ids=monitor_ids
        )
        if owned != set(monitor_ids):
            raise UnknownMonitors()
