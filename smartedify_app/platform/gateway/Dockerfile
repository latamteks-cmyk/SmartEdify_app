
FROM envoyproxy/envoy:v1.29-latest

# Configuración principal y dependencias declarativas
COPY envoy.yaml /etc/envoy/envoy.yaml
COPY config/cors-tenants.yaml /etc/gateway/cors-tenants.yaml
COPY config/ratelimit.yaml /etc/gateway/ratelimit.yaml
COPY plugins/dpop_validator.wasm /plugins/dpop_validator.wasm

EXPOSE 8080
CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]
