def test_health_does_not_require_internal_key(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_endpoint_requires_internal_key(client):
    response = client.post("/forecast")

    assert response.status_code == 401


def test_protected_endpoint_accepts_valid_internal_key_before_body_validation(client):
    response = client.post(
        "/forecast",
        headers={"X-Internal-Key": "test-internal-key"},
    )

    assert response.status_code == 422
