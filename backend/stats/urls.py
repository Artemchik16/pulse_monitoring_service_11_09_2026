from django.urls import path

from stats.views import MonitorStatsView

app_name = "stats"

urlpatterns = [
    path("monitors/<int:monitor_id>/stats", MonitorStatsView.as_view(), name="monitor-stats"),
]
