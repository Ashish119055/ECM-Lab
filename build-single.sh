#!/usr/bin/env bash
# Bundle ECM Lab into a single self-contained HTML file: dist/ecm-lab.html
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
python3 - <<'PY'
import re, os

def bundle(base, out, links=()):
    html = open(os.path.join(base, 'index.html'), encoding='utf-8').read()
    def css(m):
        return '<style>\n' + open(os.path.join(base, m.group(1)), encoding='utf-8').read() + '\n</style>'
    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)
    def js(m):
        src = open(os.path.join(base, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
        return '<script>\n' + src + '\n</script>'
    html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
    for a, b in links:
        html = html.replace('href="%s"' % a, 'href="%s"' % b)
    open(out, 'w', encoding='utf-8').write(html)
    print('Built', out)

bundle('.', 'dist/ecm-lab.html')
PY
