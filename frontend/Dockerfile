# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

COPY . .
# REACT_APP_BACKEND_URL must be baked at build time
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# ---- Runtime stage: nginx ----
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

# Custom nginx config (SPA fallback)
RUN rm /etc/nginx/conf.d/default.conf
COPY <<'EOF' /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml+rss image/svg+xml;
    gzip_min_length 1024;

    # Static assets — long cache
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
