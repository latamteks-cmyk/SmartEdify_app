FROM envoyproxy/envoy:v1.29-latest

# Configuración principal y dependencias declarativas
COPY envoy.yaml /etc/envoy/envoy.yaml
COPY config/cors-tenants.yaml /etc/gateway/cors-tenants.yaml
COPY config/ratelimit.yaml /etc/gateway/ratelimit.yaml
COPY config/prometheus.yml /etc/gateway/prometheus.yml
COPY config/otel-collector.yaml /etc/gateway/otel-collector.yaml
COPY config/spire-server.conf /etc/gateway/spire-server.conf
COPY config/spire-agent.conf /etc/gateway/spire-agent.conf
COPY plugins/dpop_validator.wasm /plugins/dpop_validator.wasm

# Crear directorios para logs y runtime state
RUN mkdir -p /var/log/envoy

EXPOSE 8080
CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]
