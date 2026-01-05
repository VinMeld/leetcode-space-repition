#!/bin/sh

# Runtime environment variable injection
# This allows overriding API_URL at container startup

# If API_URL is set, inject it into the built JS files
if [ -n "$API_URL" ]; then
  echo "Injecting API_URL: $API_URL"
  # Replace placeholder in all JS files
  find /usr/share/nginx/html -name '*.js' -exec sed -i "s|__API_URL_PLACEHOLDER__|$API_URL|g" {} \;
fi

# Execute the main command
exec "$@"
