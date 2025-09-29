from pathlib import Path
import re

CONFIG_PATH = Path("smartedify_app/platform/gateway/config/envoy.yaml")


def load_config_text() -> str:
    return CONFIG_PATH.read_text(encoding="utf-8")


def test_kid_and_issuer_headers_are_injected():
    text = load_config_text()
    assert "x-jwt-kid" in text, "Expected x-jwt-kid injection to be documented in envoy config"
    assert "x-jwt-issuer" in text, "Expected x-jwt-issuer injection to be documented in envoy config"


def test_remote_jwks_has_per_tenant_cache():
    text = load_config_text()
    assert "cache_duration: 300s" in text, "JWKS cache must refresh within 300 seconds"
    assert ".well-known/jwks.json?tenant_id=%DYNAMIC_METADATA" in text, "remote_jwks must be tenant-aware"


def test_no_global_cors_wildcard_and_forbidden_origin_guard():
    text = load_config_text()
    wildcard_pattern = re.compile(r'regex:\s*"\\.\\*"')
    assert not wildcard_pattern.search(text), "CORS wildcard .* must not reappear"
    assert "forbidden_origin" in text, "CORS guard must reject unauthorised origins"
