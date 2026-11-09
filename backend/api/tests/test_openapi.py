import pytest
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.validation import validate_schema
from rest_framework.test import APIClient

ERROR_REF = "#/components/schemas/ErrorResponse"
VALIDATION_ERROR_REF = "#/components/schemas/ValidationErrorResponse"


@pytest.fixture(scope="module")
def schema():
    return SchemaGenerator().get_schema(request=None, public=True)


def response_ref(operation: dict, code: str) -> str:
    return operation["responses"][code]["content"]["application/json"]["schema"]["$ref"]


def test_swagger_ui_is_public():
    response = APIClient().get("/api/docs")

    assert response.status_code == 200
    assert b"swagger-ui" in response.content


def test_schema_is_public_and_valid(schema):
    response = APIClient().get("/api/schema", HTTP_ACCEPT="application/json")

    assert response.status_code == 200
    validate_schema(schema)


def test_jwt_security_scheme(schema):
    assert schema["components"]["securitySchemes"]["jwtAuth"]["scheme"] == "bearer"


def test_every_operation_is_documented(schema):
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            assert operation.get("summary"), f"{method.upper()} {path} has no summary"
            assert operation.get("tags"), f"{method.upper()} {path} has no tag"


def test_protected_operations_document_401(schema):
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            if any(operation.get("security", [{}])):
                assert response_ref(operation, "401") == ERROR_REF, f"{method} {path}"


def test_public_auth_endpoints_need_no_token(schema):
    login = schema["paths"]["/api/v1/auth/login"]["post"]

    assert not any(login.get("security", [{}]))
    assert response_ref(login, "429") == ERROR_REF


def test_unified_error_format(schema):
    create = schema["paths"]["/api/v1/monitors"]["post"]
    detail = schema["paths"]["/api/v1/monitors/{id}"]["get"]
    validation = schema["components"]["schemas"]["ValidationError"]

    assert response_ref(create, "422") == VALIDATION_ERROR_REF
    assert response_ref(detail, "404") == ERROR_REF
    assert set(validation["properties"]) == {"code", "message", "fields"}
