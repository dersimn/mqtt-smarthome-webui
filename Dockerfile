FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
	openssl \
	nginx-extras lua5.1 liblua5.1-dev \
	apache2-utils \
	git diffutils autoconf libssl1.0-dev make \
	gettext-base \
	curl wget \
	&& rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/dersimn/luacrypto /opt/luacrypto \
	&& cd /opt/luacrypto \
	&& autoreconf -i \
	&& ./configure \
	&& make \
	&& mkdir -p /usr/local/lib/lua/5.1 \
	&& cp src/.libs/crypto.so /usr/local/lib/lua/5.1/crypto.so

RUN curl -sSL -o /usr/local/bin/mo https://git.io/get-mo && chmod a+x /usr/local/bin/mo

COPY www /www
COPY nginx.template /nginx.template
COPY run.bash /run.bash

EXPOSE 80
EXPOSE 443

CMD ["bash", "/run.bash"]
