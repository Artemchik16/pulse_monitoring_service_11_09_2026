from django.urls import path

from common.views import HealthView

app_name = "base"

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
]
