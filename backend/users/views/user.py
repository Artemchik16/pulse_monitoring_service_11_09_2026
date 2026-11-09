from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.serializers import UserOutputSerializer


@extend_schema(tags=["Auth"], responses={200: UserOutputSerializer})
class MeView(APIView):
    """Current authenticated user."""

    http_method_names = ("get",)
    permission_classes = (IsAuthenticated,)

    def get(self, request: Request) -> Response:
        return Response(UserOutputSerializer(request.user).data)
