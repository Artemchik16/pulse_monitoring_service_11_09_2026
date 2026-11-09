from django.urls import path

from stats.views import MonitorsSummaryView, MonitorStatsView

app_name = "stats"

urlpatterns = [
    path("monitors/summary", MonitorsSummaryView.as_view(), name="monitors-summary"),
    path("monitors/<int:monitor_id>/stats", MonitorStatsView.as_view(), name="monitor-stats"),
]
