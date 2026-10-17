"""Regression check for merging SEO locations without replacing a virtual host."""
from pathlib import Path
import runpy

root = Path(__file__).resolve().parent
patch = runpy.run_path(str(root / 'install-storefront-seo.py'))['patch']
locations = (root / 'nginx-product-social-seo.conf.example').read_text()
fixture = '''server {
 listen 80;
 server_name amolbooks.com www.amolbooks.com;
 return 301 https://www.amolbooks.com$request_uri;
}
server {
 listen 443 ssl http2;
 server_name www.amolbooks.com;
 ssl_certificate /existing/cert.pem;
 location ~ ^/product-details/([^/?]+)/?$ {
   if ($http_user_agent ~* "(Googlebot|facebookexternalhit)") {
     rewrite ^/product-details/([^/?]+)/?$ /api/product/og/$1 last;
   }
   try_files $uri /index.html;
 }
 location = /robots.txt { return 200 "old"; }
 include /etc/nginx/snippets/amolbooks-fb-feed.conf;
 location / { try_files $uri /index.html; }
 location /uploads/ { proxy_pass http://127.0.0.1:3000/api/upload/; }
}
'''
output = patch(fixture, locations)
assert 'ssl_certificate /existing/cert.pem;' in output
assert 'include /etc/nginx/snippets/amolbooks-fb-feed.conf;' in output
assert 'location / { try_files $uri /index.html; }' in output
assert 'location /uploads/ { proxy_pass http://127.0.0.1:3000/api/upload/; }' in output
assert 'location ~ ^/product-details/' not in output
for route in ['location = / {', 'location ^~ /product-details/ {', 'location = /robots.txt {', 'location ^~ /api/storefront-document/ {']:
    assert output.count(route) == 1, route
assert 'listen [::]:443 ssl http2;' in output
assert 'listen [::]:80;' in output
assert patch(output, locations) == output
try:
    patch(fixture + fixture, locations)
    raise AssertionError('Ambiguous servers should be rejected')
except ValueError:
    pass
print('PASS: nginx merge, IPv6, preserved SSL/uploads/feed/fallback, repeat install, ambiguity refusal')
