from django.urls import include, path

app_name = "api"

# /api/v1/...
urlpatterns = [
    path("auth/", include("users.urls", namespace="auth")),
    path("monitors", include("monitors.urls", namespace="monitors")),
    path("incidents", include("incidents.urls", namespace="incidents")),
]
