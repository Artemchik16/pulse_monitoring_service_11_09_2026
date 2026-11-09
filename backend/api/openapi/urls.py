from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

# Public API docs (TZ A8: /api/docs); no trailing slash, like the rest of the API
urlpatterns = [
    path(
        "schema",
        SpectacularAPIView.as_view(permission_classes=(AllowAny,), authentication_classes=()),
        name="schema",
    ),
    path(
        "docs",
        SpectacularSwaggerView.as_view(
            url_name="schema", permission_classes=(AllowAny,), authentication_classes=()
        ),
        name="swagger-docs",
    ),
]
