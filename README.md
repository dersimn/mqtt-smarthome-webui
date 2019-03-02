![title](https://raw.githubusercontent.com/dersimn/mqtt-smarthome-webui/master/docs/title.png)

## Config

Provide a file `data.json` with the page structure you want to offer, see [example](https://github.com/dersimn/mqtt-smarthome-webui/blob/master/www/data.json) for reference. Provide IP and port of your MQTT broker, by setting env variable `MQTT_HOST`. You have to enable Websockets on your broker, the Docker image `toke/mosquitto`for e.g. has it enabled by default on port 9001.

    docker run -d --restart=always \
        -v $(pwd)/yourconfig.json:/www/data.json:ro \
        -e "MQTT_HOST=10.1.1.50:9001" \
        -p 80:80 \
        dersimn/mqtt-smarthome-webui

If you provide an SSL key/cert pair in `/ssl`, the Docker image will also enable HTTPS and additionally you can enable client-authentification via SSL certificates. HTTPS and client-auth are optional for local networks, according to [these](https://github.com/dersimn/mqtt-smarthome-webui/blob/6e419811d3bd433e5fc594e1beccaa0499fe08cf/nginx.template#L69) IP ranges. If you make port 80/443 public to the Internet you should definitely enable client-auth.

You can configure HTTPS and client certificates by providing these files:

* `/ssl/nginx.key`
* `/ssl/nginx.crt`
* `/ssl/client.crt`
* `/ssl/client.crl`

A nice tutorial on how to generate your own certificates, is located [here](https://jamielinux.com/docs/openssl-certificate-authority/introduction.html). Maybe I'll provide an automated solution in the future. The whole command could look like this:

    docker run -d --restart=always \
        -v $(pwd)/yourconfig.json:/www/data.json:ro \
        -v $(pwd)/ssl:/ssl:ro \
        -e "MQTT_HOST=10.1.1.50:9001" \
        -p 80:80 \
        -p 443:443 \
        dersimn/mqtt-smarthome-webui

If you want to change the default ports, specify it like this: `-p 8001:80 -p 8443:443 -e "HTTPS_REDIRECT_PORT=8443"`.

## Development

    git clone https://github.com/dersimn/mqtt-smarthome-webui
    cd mqtt-smarthome-webui
    docker build .

For development, start a Docker Container with the following command, changes to files in `/www` are applied without rebuilding the container:

    docker run -v $(pwd)/www:/www:ro                       -p 80:80            -e "MQTT_HOST=10.1.1.101:9001" <id>
    docker run -v $(pwd)/www:/www:ro -v $(pwd)/ssl:/ssl:ro -p 80:80 -p 443:443 -e "MQTT_HOST=10.1.1.101:9001" <id>

For a simple simulation environment consider also running

    git clone https://github.com/dersimn/mqtt-smarthome-demo.git
    cd mqtt-smarthome-demo
    docker-compose up -d mqtt admin logic

in background.

## Credits

This project follows [Oliver "owagner" Wagner](https://github.com/owagner)'s architectural proposal for an [mqtt-smarthome](https://github.com/mqtt-smarthome/mqtt-smarthome). Set of [basic icons](https://dribbble.com/shots/2084609-Smart-House-Icon-Set-Free) freely provided by [Roman "Minsk" Malashov](https://dribbble.com/Miart).