from django.urls import include, path

app_name = "api"

# /api/v1/...
urlpatterns = [
    path("auth/", include("users.urls", namespace="auth")),
]
