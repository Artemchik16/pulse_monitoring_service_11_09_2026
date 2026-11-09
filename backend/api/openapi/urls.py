from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

# Документация API открыта (ТЗ A8: /api/docs)
urlpatterns = [
    path(
        "schema/",
        SpectacularAPIView.as_view(permission_classes=(AllowAny,), authentication_classes=()),
        name="schema",
    ),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema", permission_classes=(AllowAny,), authentication_classes=()
        ),
        name="swagger-docs",
    ),
]
