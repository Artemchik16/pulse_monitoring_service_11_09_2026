from django.urls import path
from rest_framework.routers import SimpleRouter

from playground.views import PlaygroundTargetViewSet, playground_probe

app_name = "playground"

router = SimpleRouter(trailing_slash=False)
router.register("playground/targets", PlaygroundTargetViewSet, basename="target")

urlpatterns = [
    *router.urls,
    path("playground/<slug:slug>", playground_probe, name="probe"),
]
