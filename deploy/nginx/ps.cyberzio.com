server {
    server_name ps.cyberzio.com;

    root /var/www/pawn-shop-erp/pawn-erp/dist;
    index index.html;

    client_max_body_size 10M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|eot)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }

    access_log /var/log/nginx/pawn-erp_access.log;
    error_log  /var/log/nginx/pawn-erp_error.log warn;

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/ps.cyberzio.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/ps.cyberzio.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = ps.cyberzio.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name ps.cyberzio.com;
    return 404; # managed by Certbot
}
