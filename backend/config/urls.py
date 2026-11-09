from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path(settings.ADMIN_PAGE_LOCATION, admin.site.urls),
    path("api/v1/", include("api.urls.api_urls", namespace="api")),
    path("api/", include("api.openapi.urls")),
    path("", include("api.urls.base_urls", namespace="base")),
]
