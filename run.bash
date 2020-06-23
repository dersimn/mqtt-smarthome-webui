#!/bin/bash
set -e

CONFIG_PATH="/etc/nginx/nginx.conf"

# Get settings
if [ -f /ssl/nginx.key ] && [ -f /ssl/nginx.crt ]; then
	export ENABLE_HTTPS=true
fi
if [ -f /ssl/client.crt ]; then
	export SSL_CLIENT_AUTH=true
fi
if [ -f /ssl/client.crl ]; then
	export SSL_CLIENT_AUTH_CRL=true
fi
if [[ -z "${HTTPS_REDIRECT_PORT}" ]]; then
	HTTPS_REDIRECT_PORT=""
else
	HTTPS_REDIRECT_PORT=":${HTTPS_REDIRECT_PORT}"
fi
if [ -f /nginx.log ]; then
    export ACCESS_LOG_FILE=true
fi

# Build Config
export MO_FALSE_IS_EMPTY=true
cat /nginx.template | mo > ${CONFIG_PATH}

# Run
cat ${CONFIG_PATH} 
exec nginx -g "daemon off;"
