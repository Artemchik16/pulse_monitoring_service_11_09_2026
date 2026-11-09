from celery import shared_task

from checks.constants import CHECK_LOCK_MARGIN_SEC
from checks.services import CheckService, SchedulerService
from monitors.constants import MAX_TIMEOUT_MS


@shared_task(name="checks.dispatch_due_checks", ignore_result=True)
def dispatch_due_checks() -> int:
    """Beat entry point: enqueue checks for due monitors."""

    return SchedulerService().dispatch_due()


@shared_task(
    name="checks.run_check",
    ignore_result=True,
    soft_time_limit=MAX_TIMEOUT_MS // 1000 + CHECK_LOCK_MARGIN_SEC,
)
def run_check(monitor_id: int) -> None:
    """Worker entry point: check one monitor."""

    CheckService().run(monitor_id=monitor_id)
