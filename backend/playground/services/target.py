from playground.models import PlaygroundTarget
from playground.repositories import PlaygroundTargetRepository


class PlaygroundService:
    """Switching playground endpoints between modes."""

    def __init__(self) -> None:
        self._playground_target_repository = PlaygroundTargetRepository()

    def set_mode(self, *, slug: str, mode: str) -> PlaygroundTarget:
        target = self._playground_target_repository.get_by_slug(slug=slug)
        return self._playground_target_repository.set_mode(target=target, mode=mode)
