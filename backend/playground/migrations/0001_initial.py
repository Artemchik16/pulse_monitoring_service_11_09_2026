from django.db import migrations, models

# One endpoint per mode, starting in that mode (the demo account has a monitor on each)
MODES = ("ok", "error", "slow", "hang", "flapping", "redirect-loop", "huge-body", "wrong-content")


def create_targets(apps, schema_editor):
    target = apps.get_model("playground", "PlaygroundTarget")
    for mode in MODES:
        target.objects.get_or_create(slug=mode, defaults={"mode": mode})


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PlaygroundTarget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=40, unique=True)),
                (
                    "mode",
                    models.CharField(
                        choices=[
                            ("ok", "ok — 200 за 100 мс"),
                            ("error", "error — 500"),
                            ("slow", "slow — 200 через 5–10 с"),
                            ("hang", "hang — не отвечает дольше таймаута"),
                            ("flapping", "flapping — 200 или 503 (~30% ошибок)"),
                            ("redirect-loop", "redirect-loop — бесконечные редиректы"),
                            ("huge-body", "huge-body — ответ 50 МБ потоком"),
                            ("wrong-content", "wrong-content — HTML вместо JSON"),
                        ],
                        max_length=20,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("id",)},
        ),
        migrations.RunPython(create_targets, migrations.RunPython.noop),
    ]
