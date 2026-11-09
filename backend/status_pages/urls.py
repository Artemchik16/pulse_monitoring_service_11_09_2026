from django.urls import path
from rest_framework.routers import SimpleRouter

from status_pages.views import PublicStatusPageView, StatusPageViewSet

app_name = "status_pages"

router = SimpleRouter(trailing_slash=False)
router.register("status-pages", StatusPageViewSet, basename="status-page")

urlpatterns = [
    *router.urls,
    path("public/status-pages/<slug:slug>", PublicStatusPageView.as_view(), name="public"),
]
