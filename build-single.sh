#!/usr/bin/env bash
# Bundle ECM Lab into a single self-contained HTML file: dist/ecm-lab.html
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
python3 - <<'PY'
import re
html = open('index.html', encoding='utf-8').read()
css = open('css/style.css', encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
def inline(m):
    return '<script>\n' + open(m.group(1), encoding='utf-8').read() + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
open('dist/ecm-lab.html', 'w', encoding='utf-8').write(html)
PY
echo "Built dist/ecm-lab.html"
