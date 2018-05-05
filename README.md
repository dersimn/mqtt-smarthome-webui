## Development

While actively developing, you can start a Docker Container with the following command:

	docker run -v $(pwd)/www:/www:ro -p 8080:80 -e "MQTT_WS_URL=http://10.1.1.50:9001" dersimn/mqtt-smarthome-nginx

Testing with SSL support:

	docker run -v $(pwd)/www:/www:ro -v $(pwd)/ssl:/ssl:ro -p 80:80 -p 443:443 -e "MQTT_WS_URL=http://10.1.1.50:9001" dersimn/mqtt-smarthome-nginx
