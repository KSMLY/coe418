FROM nginx:alpine

RUN apk add --no-cache openssl


COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY tools/ssl.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/ssl.sh
RUN mkdir -p /etc/nginx/ssl

EXPOSE 443

CMD ["/bin/sh", "-c", "/usr/local/bin/ssl.sh && nginx -g 'daemon off;'"]
