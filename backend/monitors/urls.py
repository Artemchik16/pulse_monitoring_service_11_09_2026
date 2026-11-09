from rest_framework.routers import SimpleRouter

from monitors.views import MonitorViewSet

app_name = "monitors"

router = SimpleRouter(trailing_slash=False)
router.register("", MonitorViewSet, basename="monitor")

urlpatterns = router.urls
