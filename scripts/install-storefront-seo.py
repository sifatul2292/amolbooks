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
               'api/storefront-document', 'product-list', 'category-list', 'author-list', 'publisher-list', 'blogs', 'offers', 'contact-us')
    removals = []
    for match in re.finditer(r'(?m)^\s*location\s+([^\n{]+)\{', body):
        selector = match.group(1).strip()
        if selector == '= /' or any(re.search(r'(?<![\w-])/' + re.escape(route) + r'(?![\w-])', selector) for route in targets):
            removals.append((match.start(), block_end(body, match.start())))
    for left, right in reversed(removals):
        body = body[:left] + body[right:]
    opening = body.index('{') + 1
    body = body[:opening] + '\n' + locations + '\n' + body[opening:]
    return text[:start] + body + text[end:]


if __name__ == '__main__':
    config = Path('/etc/nginx/sites-enabled/amolbooks.com').resolve()
    locations = Path(__file__).with_name('nginx-product-social-seo.conf.example').read_text()
    original = config.read_text()
    updated = patch(original, locations)
    backup = Path('/root/nginx-storefront-seo-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.bak')
    shutil.copy2(config, backup)
    config.write_text(updated)
    if subprocess.run(['nginx', '-t']).returncode:
        config.write_text(original)
        raise SystemExit('nginx validation failed; original restored. Backup: ' + str(backup))
    if subprocess.run(['systemctl', 'reload', 'nginx']).returncode:
        config.write_text(original)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise SystemExit('Reload failed; original restored. Backup: ' + str(backup))
    print('SEO routing installed. Backup:', backup)
