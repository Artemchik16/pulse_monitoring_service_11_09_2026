from dataclasses import asdict

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.serializers import (
    AuthOutputSerializer,
    LoginInputSerializer,
    RefreshInputSerializer,
    RegisterInputSerializer,
    TokenPairOutputSerializer,
)
from users.services import AuthService
from users.throttling import AuthRateThrottle


class AuthBaseView(APIView):
    """Shared wiring for auth endpoints."""

    http_method_names = ("post",)
    throttle_classes = (AuthRateThrottle,)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._auth_service = AuthService()


@extend_schema(
    tags=["Auth"],
    request=RegisterInputSerializer,
    responses={201: AuthOutputSerializer, 422: OpenApiResponse(description="Validation error")},
)
class RegisterView(AuthBaseView):
    """Register a new account."""

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def post(self, request: Request) -> Response:
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, tokens = self._auth_service.register(**serializer.validated_data)
        payload = AuthOutputSerializer({"user": user, "tokens": asdict(tokens)}).data
        return Response(payload, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Auth"],
    request=LoginInputSerializer,
    responses={200: AuthOutputSerializer, 401: OpenApiResponse(description="Invalid credentials")},
)
class LoginView(AuthBaseView):
    """Sign in with email and password."""

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def post(self, request: Request) -> Response:
        serializer = LoginInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, tokens = self._auth_service.login(**serializer.validated_data)
        return Response(AuthOutputSerializer({"user": user, "tokens": asdict(tokens)}).data)


@extend_schema(
    tags=["Auth"],
    request=RefreshInputSerializer,
    responses={200: TokenPairOutputSerializer, 401: OpenApiResponse(description="Invalid token")},
)
class RefreshView(AuthBaseView):
    """Exchange a refresh token for a new rotated pair."""

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def post(self, request: Request) -> Response:
        serializer = RefreshInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = self._auth_service.refresh(refresh_token=serializer.validated_data["refresh"])
        return Response(TokenPairOutputSerializer(asdict(tokens)).data)


@extend_schema(
    tags=["Auth"],
    request=RefreshInputSerializer,
    responses={204: None, 401: OpenApiResponse(description="Invalid token")},
)
class LogoutView(AuthBaseView):
    """Revoke the refresh token of the current session."""

    permission_classes = (IsAuthenticated,)

    def post(self, request: Request) -> Response:
        serializer = RefreshInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self._auth_service.logout(
            user=request.user, refresh_token=serializer.validated_data["refresh"]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
