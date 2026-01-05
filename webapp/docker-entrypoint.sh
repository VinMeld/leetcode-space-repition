#!/bin/sh

# Runtime environment variable injection
# This allows overriding API_URL at container startup

# Default to empty string if not set (for relative /api paths)
API_URL="${API_URL:-}"

echo "Injecting API_URL: '${API_URL}'"

# Replace placeholder in all JS files (even if API_URL is empty)
find /usr/share/nginx/html -name '*.js' -exec sed -i "s|__API_URL_PLACEHOLDER__|${API_URL}|g" {} \;

# Execute the main command
exec "$@"
