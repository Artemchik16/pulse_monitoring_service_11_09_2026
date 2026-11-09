from django.urls import path

from checks.views import MonitorChecksView

app_name = "checks"

urlpatterns = [
    path("monitors/<int:monitor_id>/checks", MonitorChecksView.as_view(), name="monitor-checks"),
]
