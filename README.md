## Development

While actively developing the HTML scripts you can start a Docker Container with the following command:

	docker run -d --rm -v $(pwd)/www:/www:ro -p 8080:80 -e "MQTT_WS_URL=http://10.1.1.50:9001" dersimn/mqtt-smarthome-nginx
