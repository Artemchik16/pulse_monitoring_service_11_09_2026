from celery.signals import task_postrun, task_prerun

from common.logging.context import reset_request_id, set_request_id

_tokens: dict[str, object] = {}


def connect_task_request_id() -> None:
    """Use the Celery task id as request_id in logs written while the task runs."""

    task_prerun.connect(_on_task_prerun, weak=False)
    task_postrun.connect(_on_task_postrun, weak=False)


def _on_task_prerun(task_id: str, **kwargs) -> None:
    _tokens[task_id] = set_request_id(task_id)


def _on_task_postrun(task_id: str, **kwargs) -> None:
    token = _tokens.pop(task_id, None)
    if token is not None:
        reset_request_id(token)
