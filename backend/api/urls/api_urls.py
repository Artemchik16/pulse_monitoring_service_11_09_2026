from django.urls import include, path

app_name = "api"

# /api/v1/...
urlpatterns = [
    path("auth/", include("users.urls", namespace="auth")),
    path("", include("monitors.urls", namespace="monitors")),
    path("", include("incidents.urls", namespace="incidents")),
    path("", include("stats.urls", namespace="stats")),
    path("", include("checks.urls", namespace="checks")),
    path("", include("status_pages.urls", namespace="status_pages")),
]
