from rest_framework.routers import SimpleRouter

from incidents.views import IncidentViewSet

app_name = "incidents"

router = SimpleRouter(trailing_slash=False)
router.register("", IncidentViewSet, basename="incident")

urlpatterns = router.urls
