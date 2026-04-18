FROM caddy:2.7.4-alpine

# Copy default Caddyfile (will append routes dynamically)
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
