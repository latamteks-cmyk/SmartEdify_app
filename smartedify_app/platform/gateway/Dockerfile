# Use the official Envoy image
FROM envoyproxy/envoy:v1.23-latest

# Copy the custom Envoy configuration
COPY config/envoy.yaml /etc/envoy/envoy.yaml

# Copy the WASM plugin
COPY plugins/dpop_validator.wasm /etc/envoy/plugins/dpop_validator.wasm

# Expose the Envoy ports
EXPOSE 8080 9901
