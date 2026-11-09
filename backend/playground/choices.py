from django.db import models


class PlaygroundModeChoices(models.TextChoices):
    """How a playground endpoint answers (TZ D1)."""

    OK = "ok", "ok — 200 за 100 мс"
    ERROR = "error", "error — 500"
    SLOW = "slow", "slow — 200 через 5–10 с"
    HANG = "hang", "hang — не отвечает дольше таймаута"
    FLAPPING = "flapping", "flapping — 200 или 503 (~30% ошибок)"
    REDIRECT_LOOP = "redirect-loop", "redirect-loop — бесконечные редиректы"
    HUGE_BODY = "huge-body", "huge-body — ответ 50 МБ потоком"
    WRONG_CONTENT = "wrong-content", "wrong-content — HTML вместо JSON"
