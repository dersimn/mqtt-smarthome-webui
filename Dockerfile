ARG BASE_IMAGE=dersimn/nginx-websocket-proxy-client-certificate:1-debian

# ------------------------------------------------------------------------------

FROM --platform=linux/amd64 node:18 as jsbuilder

RUN npm install -g grunt

COPY .git /app/.git
COPY package.json /app/package.json
COPY Gruntfile.js /app/Gruntfile.js

WORKDIR /app

RUN npm install \
    && grunt

# ------------------------------------------------------------------------------

FROM ${BASE_IMAGE}

COPY www /www
COPY --from=jsbuilder /app/www/bundle.js /www/bundle.js
COPY --from=jsbuilder /app/www/bundle.css /www/bundle.css

ENV WS_PROXY_PATH /mqtt
ENV DEDICATED_COOKIE_LOCATION /cookie  # only valid for ios-workaround
