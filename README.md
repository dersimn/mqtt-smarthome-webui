![title](https://raw.githubusercontent.com/dersimn/mqtt-smarthome-webui/master/docs/title.png)

## Config

Provide a file `data.yaml` with the page structure you want to offer, see [example](https://github.com/dersimn/mqtt-smarthome-webui/blob/master/www/data.yaml) for reference.

This image can proxy-pass the Websocket connection from your MQTT broker, by setting the env variable `MQTT_HOST`.  
You have to enable Websockets on your broker. The Docker Image [toke/mosquitto](https://hub.docker.com/r/toke/mosquitto) for e.g. has it already enabled by default on [port 9001](https://github.com/toke/docker-mosquitto/blob/8aa0a74b444fb2377fcd4a43ac85a257aef51176/config/conf.d/websockets.conf#L1), where the official Docker Image [eclipse-mosquitto](https://hub.docker.com/_/eclipse-mosquitto) need to be configured first.

    docker run -d --restart=always \
        -v $(pwd)/yourconfig.yaml:/www/data.yaml:ro \
        -e "MQTT_HOST=10.1.1.50:9001" \
        -p 80:80 \
        dersimn/mqtt-smarthome-webui

### SSL / HTTPS

If you provide an SSL key/cert pair in `/ssl`, the Docker Image will also enable HTTPS:

* `/ssl/nginx.key`
* `/ssl/nginx.crt`

Additionally you can enable client-authentification via SSL certificates, by providing:

* `/ssl/client.crt`

In case you have revoked clients, also prodive a `/ssl/client.crl` file.

A nice tutorial on how to generate your own certificates, is located [here](https://jamielinux.com/docs/openssl-certificate-authority/introduction.html).

    docker run -d --restart=always \
        -v $(pwd)/yourconfig.json:/www/data.json:ro \
        -v $(pwd)/ssl:/ssl:ro \
        -e "MQTT_HOST=10.1.1.50:9001" \
        -p 80:80 \
        -p 443:443 \
        dersimn/mqtt-smarthome-webui

HTTPS and client-auth are optional for clients connecting from a local IP, according to [these](https://github.com/dersimn/mqtt-smarthome-webui/blob/master/nginx.template#L89) IP ranges. If you don't want this behaviour, set `-e WHITELIST_LOCAL_IP=false` to force SSL and client-auth for everyone.

### Non-default ports

If you want to change the default ports, specify it like this: `-p 8001:80 -p 8443:443 -e "HTTPS_REDIRECT_PORT=8443"`.

### Detailed access log

If you provide the file `/nginx.log`, nginx will enable a more detailed access log. This file can be a regular file or a FIFO, to further process the logged data with e.g. Telegraf.

## Development

    npm i
    npx grunt

You probably also need a MQTT Broker:

    docker run -d --restart=always --name=mqtt -p 1883:1883 -p 9001:9001 -v "$(pwd)/contrib/mosquitto.conf":/mosquitto/config/mosquitto.conf:ro eclipse-mosquitto

With this project you *can* have the cake and eat it, both: Start a Docker container with the following command to simulate the later productive environment. To change files immediately without rebuilding the Docker Image everytime a change is made, the `/www` folder can simply be mounted into the Container:
    
    docker build -t webui .
    docker run --rm -v "$(pwd)/www":/www:ro                       -p 80:80            -e MQTT_HOST=host.docker.internal:9001 webui
    docker run --rm -v "$(pwd)/www":/www:ro -v $(pwd)/ssl:/ssl:ro -p 80:80 -p 443:443 -e MQTT_HOST=host.docker.internal:9001 webui

For a simple simulation environment consider also running

    git clone https://github.com/dersimn/mqtt-smarthome-demo.git
    cd mqtt-smarthome-demo
    docker-compose up -d mqtt admin logic

in background.

### Build

    docker buildx create --name mybuilder
    docker buildx use mybuilder
    docker buildx build --platform linux/amd64,linux/arm/v7 -t dersimn/mqtt-smarthome-webui -t dersimn/mqtt-smarthome-webui:1.x.0 --push .

## Credits

This project follows [Oliver "owagner" Wagner](https://github.com/owagner)'s architectural proposal for an [mqtt-smarthome](https://github.com/mqtt-smarthome/mqtt-smarthome). Set of [basic icons](https://dribbble.com/shots/2084609-Smart-House-Icon-Set-Free) freely provided by [Roman "Minsk" Malashov](https://dribbble.com/Miart).