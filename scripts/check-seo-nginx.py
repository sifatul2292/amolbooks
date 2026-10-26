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
 location /index.html { add_header Cache-Control "no-cache"; }
 location ~* \\.(?:css|js|png|webp)$ { try_files $uri =404; expires 6M; }
 error_page 404 /index.html;
 gzip on;
 location /uploads/ { proxy_pass http://127.0.0.1:3000/api/upload/; }
}
'''
output = patch(fixture, locations)
assert 'ssl_certificate /existing/cert.pem;' in output
assert 'include /etc/nginx/snippets/amolbooks-fb-feed.conf;' in output
assert 'try_files $uri @amol_storefront;' in output
assert 'location @amol_storefront {' in output
assert 'proxy_intercept_errors off;' in output
assert 'try_files $uri /index.html;' not in output
assert 'error_page 404 /index.html;' not in output
assert 'location /index.html {' not in output
assert 'location ~* \\.(?:css|js|png|webp)$ { try_files $uri =404; expires 6M; }' in output
assert 'gzip on;' in output
for route in ['/home', '/home/', '/index.html']:
    assert output.count('location = ' + route + ' {') == 1
assert output.count('https://www.amolbooks.com/$is_args$args') == 3
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
print('PASS: nginx merge, backend fallback, alias redirects, real asset 404s, preserved SSL/uploads/feed/gzip, IPv6, repeat install, ambiguity refusal')

patch_private = runpy.run_path(str(root / 'install-storefront-seo.py'))['patch_private']
for host in ('apisub.amolbooks.com', 'adminsub.amolbooks.com'):
    private = '''server {
 listen 443 ssl http2;
 server_name HOST;
 location / { proxy_pass http://127.0.0.1:3000; }
 location = /index.html { add_header Cache-Control "no-cache"; }
 location /api/upload/ { add_header Cache-Control "public"; }
}
'''.replace('HOST',host)
    result = patch_private(private, host)
    assert result.count('add_header X-Robots-Tag $amol_private_seo_robots always;') == 3
    assert 'location / { proxy_pass http://127.0.0.1:3000; }' in result
    assert result.count('location = /robots.txt') == 1
    assert 'Allow: /' in result
    assert 'Disallow: /' not in result
    assert 'proxy_pass http://127.0.0.1:3000;' in result
    assert patch_private(result,host) == result
    if host.startswith('apisub'):
        assert 'default "";' in result and '~*text/html "noindex";' in result
print('PASS: private HTML noindex survives location headers, images unaffected, robots allow recrawl')
