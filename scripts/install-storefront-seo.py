#!/usr/bin/env python3
"""Install the reviewed SEO locations; preserve the rest of the virtual host."""
from pathlib import Path
from datetime import datetime
import re
import shutil
import subprocess


def block_end(text, start):
    tokens = re.finditer(r'''\#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}]''', text[start:])
    depth = 0
    for token in tokens:
        if token.group() == '{':
            depth += 1
        elif token.group() == '}':
            depth -= 1
            if depth == 0:
                return start + token.end()
    raise ValueError('Unbalanced nginx block')


def patch(text, locations):
    # This file loads before the legacy uisub host; cover IPv6 as well as IPv4.
    for match in reversed(list(re.finditer(r'(?m)^\s*server\s*\{', text))):
        end = block_end(text, match.start())
        body = text[match.start():end]
        for port in (80, 443):
            if not re.search(r'listen\s+\[::\]:' + str(port) + r'\b', body):
                body = re.sub(r'(?m)^(\s*)listen ' + str(port) + r'([^;]*);',
                              lambda m: m.group(0) + '\n' + m.group(1) + 'listen [::]:' + str(port) + m.group(2) + ';', body, count=1)
        text = text[:match.start()] + body + text[end:]
    matches = []
    for match in re.finditer(r'(?m)^\s*server\s*\{', text):
        end = block_end(text, match.start())
        body = text[match.start():end]
        if re.search(r'(?m)^\s*server_name\s+www\.amolbooks\.com\s*;', body) and re.search(r'listen\s+443\b', body):
            matches.append((match.start(), end, body))
    if len(matches) != 1:
        raise ValueError('Expected one HTTPS www-only server; no changes made')
    start, end, body = matches[0]
    if locations in body:
        return text
    targets = ('robots.txt', 'sitemap.xml', 'product-details', 'special-package-details',
               'api/storefront-document', 'product-list', 'category-list', 'author-list', 'publisher-list', 'blogs', 'offers', 'contact-us', 'home', 'index.html')
    removals = []
    for match in re.finditer(r'(?m)^\s*location\s+([^\n{]+)\{', body):
        selector = match.group(1).strip()
        if selector in ('= /', '/', '@amol_storefront') or any(re.search(r'(?<![\w-])/' + re.escape(route) + r'(?![\w-])', selector) for route in targets):
            removals.append((match.start(), block_end(body, match.start())))
    for left, right in reversed(removals):
        body = body[:left] + body[right:]
    # A server-wide Angular error page also catches missing assets and discards
    # the backend's useful 404 body. The backend now owns document fallbacks.
    body = re.sub(r'(?m)^[ \t]*error_page\s+404\s+/index\.html\s*;[^\n]*\n?', '', body)
    opening = body.index('{') + 1
    body = body[:opening] + '\n' + locations + '\n' + body[opening:]
    return text[:start] + body + text[end:]


def patch_private(text, hostname):
    marker = '# AMOL private HTML indexing policy'
    if marker in text:
        return text
    candidates = []
    for match in re.finditer(r'(?m)^\s*server\s*\{', text):
        end = block_end(text, match.start())
        body = text[match.start():end]
        if re.search(r'server_name\s+' + re.escape(hostname) + r'\s*;', body) and re.search(r'listen\s+443\b', body):
            candidates.append((match.start(), end, body))
    if len(candidates) != 1:
        raise ValueError('Expected one HTTPS server for ' + hostname)
    start, end, body = candidates[0]
    # Keep crawlers able to read noindex, without advertising the old API sitemap.
    for match in reversed(list(re.finditer(r'(?m)^\s*location\s+=\s+/robots\.txt\s*\{', body))):
        body = body[:match.start()] + body[block_end(body, match.start()):]
    header = '\n    add_header X-Robots-Tag $amol_private_seo_robots always;\n'
    # nginx locations with their own add_header do not inherit server headers.
    for match in reversed(list(re.finditer(r'(?m)^\s*location\s+[^\n{]+\{', body))):
        location = body[match.end() - 1:block_end(body, match.start())]
        depth = 0
        own_headers = False
        for token in re.finditer(r'''\#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}]|\badd_header\b''', location):
            if token.group() == '{':
                depth += 1
            elif token.group() == '}':
                depth -= 1
            elif token.group() == 'add_header' and depth == 1:
                own_headers = True
        if own_headers:
            body = body[:match.end()] + header + body[match.end():]
    opening = body.index('{') + 1
    robots = '\n    location = /robots.txt {\n        default_type text/plain;\n        return 200 "User-agent: *\\nAllow: /\\n";\n    }\n'
    body = body[:opening] + '\n    ' + marker + header + robots + body[opening:]
    result = text[:start] + body + text[end:]
    if hostname == 'apisub.amolbooks.com':
        result = 'map $sent_http_content_type $amol_private_seo_robots {\n    default "";\n    ~*text/html "noindex";\n}\n' + result
    return result


if __name__ == '__main__':
    directory = Path('/etc/nginx/sites-enabled')
    locations = Path(__file__).with_name('nginx-product-social-seo.conf.example').read_text()
    changes = []
    for host in ('amolbooks.com', 'apisub.amolbooks.com', 'adminsub.amolbooks.com'):
        config = (directory / host).resolve()
        original = config.read_text()
        updated = patch(original, locations) if host == 'amolbooks.com' else patch_private(original, host)
        changes.append((config, original, updated))
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    for config, original, updated in changes:
        backup = Path('/root/nginx-seo-' + config.name + '-' + stamp + '.bak')
        shutil.copy2(config, backup)
        print('Backup:', backup)
    try:
        for config, original, updated in changes:
            config.write_text(updated)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except BaseException:
        for config, original, updated in changes:
            config.write_text(original)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print('Storefront SEO and private-host noindex installed.')
