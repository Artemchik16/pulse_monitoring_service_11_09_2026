from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from status_pages.models import StatusPage
from status_pages.repositories import StatusPageRepository
from status_pages.serializers import StatusPageInputSerializer, StatusPageOutputSerializer
from status_pages.services import StatusPageService


@extend_schema_view(
    list=extend_schema(summary="Мои статус-страницы"),
    retrieve=extend_schema(summary="Статус-страница"),
    create=extend_schema(
        summary="Создать статус-страницу",
        description="`slug` — адрес страницы `/status/{slug}`. В `monitor_ids` — свои мониторы; "
        "публично показываются только те из них, у кого включён флаг «Публичный».",
        request=StatusPageInputSerializer,
        responses={201: StatusPageOutputSerializer},
    ),
    update=extend_schema(
        summary="Изменить статус-страницу",
        request=StatusPageInputSerializer,
        responses=StatusPageOutputSerializer,
    ),
    destroy=extend_schema(summary="Удалить статус-страницу"),
)
@extend_schema(tags=["Status pages"])
class StatusPageViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """CRUD for the current user's status pages."""

    http_method_names = ("get", "post", "put", "delete")
    serializer_class = StatusPageOutputSerializer
    lookup_value_regex = r"\d+"

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._status_page_repository = StatusPageRepository()
        self._status_page_service = StatusPageService()

    def get_queryset(self) -> QuerySet[StatusPage]:
        return self._status_page_repository.list_by_owner(owner_id=self.request.user.id)

    def get_object(self) -> StatusPage:
        return self._status_page_repository.get_by_id(
            page_id=self.kwargs["pk"], owner_id=self.request.user.id
        )

    def create(self, request: Request) -> Response:
        serializer = StatusPageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        page = self._status_page_service.create(
            owner_id=request.user.id, **serializer.validated_data
        )
        page = self.get_object_by_id(page.id)
        return Response(StatusPageOutputSerializer(page).data, status=status.HTTP_201_CREATED)

    def update(self, request: Request, pk: int) -> Response:
        page = self.get_object()
        serializer = StatusPageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self._status_page_service.update(
            page=page, owner_id=request.user.id, **serializer.validated_data
        )
        return Response(StatusPageOutputSerializer(self.get_object_by_id(page.id)).data)

    def destroy(self, request: Request, pk: int) -> Response:
        self._status_page_service.delete(page=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_object_by_id(self, page_id: int) -> StatusPage:
        # Re-read with the prefetched monitor list for the response
        return self._status_page_repository.get_by_id(
            page_id=page_id, owner_id=self.request.user.id
        )
