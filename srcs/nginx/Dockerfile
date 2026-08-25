FROM nginx:1.29-alpine

RUN apk add --no-cache openssl \
	&& mkdir -p /etc/nginx/certs \
	&& openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
		-keyout /etc/nginx/certs/selfsigned.key \
		-out /etc/nginx/certs/selfsigned.crt \
		-subj "/C=PT/ST=Porto/L=Porto/O=ArtMate/OU=42 Porto/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1" \
	&& chmod 600 /etc/nginx/certs/selfsigned.key

COPY snippets/ /etc/nginx/snippets/
COPY templates/ /etc/nginx/templates/

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
	CMD wget --no-check-certificate -qO- https://127.0.0.1/health || exit 1
