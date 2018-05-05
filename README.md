## Development

	docker build .

Run:

	docker run -v $(pwd)/ssl:/ssl:ro -p 80:80 -p 443:443 <id>

For development, start a Docker Container with the following command:

	docker run -v $(pwd)/www:/www:ro -v $(pwd)/ssl:/ssl:ro -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf -p 80:80 -p 443:443 <id>
