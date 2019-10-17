FROM ubuntu:18.04 as builder

RUN apt-get update && apt-get install -y \
        build-essential \
        lua5.1 liblua5.1-dev \
        git \
        autoconf \
        libssl1.0-dev \
        curl \
        nodejs npm \
    && npm install -g npm grunt

RUN git clone https://github.com/dersimn/luacrypto /opt/luacrypto \
    && cd /opt/luacrypto \
    && autoreconf -i \
    && ./configure \
    && make

RUN curl -sSL -o /mo https://git.io/get-mo && chmod a+x /mo

COPY package.json /app/package.json
COPY Gruntfile.js /app/Gruntfile.js

RUN cd /app \
    && npm install \
    && grunt


FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
        nginx-extras \
        lua5.1 \
        libssl1.0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/luacrypto/src/.libs/crypto.so /usr/local/lib/lua/5.1/crypto.so
COPY --from=builder /mo /usr/local/bin/mo

COPY www /www
COPY nginx.template /nginx.template
COPY run.bash /run.bash
COPY --from=builder /app/www/bundle.js /www/bundle.js
COPY --from=builder /app/www/bundle.css /www/bundle.css

EXPOSE 80
EXPOSE 443

CMD ["bash", "/run.bash"]
