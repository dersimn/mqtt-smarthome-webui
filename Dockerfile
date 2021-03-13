FROM node as jsbuilder

RUN npm install -g grunt

COPY .git /app/.git
COPY package.json /app/package.json
COPY Gruntfile.js /app/Gruntfile.js

WORKDIR /app

RUN npm install \
    && grunt

# ------------------------------------------------------------------------------

FROM dersimn/nginx-websocket-proxy-client-certificate-ios-workaround:3

COPY www /www
COPY --from=jsbuilder /app/www/bundle.js /www/bundle.js
COPY --from=jsbuilder /app/www/bundle.css /www/bundle.css

EXPOSE 80
EXPOSE 443

ENV WS_PROXY_PATH /mqtt
ENV DEDICATED_COOKIE_LOCATION /cookie
