#!/usr/bin/env python3
"""Extract table-like IRPG pages into structured blocks: python3 tools/build_tables.py IRPG.pdf
Writes tables.js (self.TABLES[sectionId] = blocks). Text is taken from the PDF, never retyped.
Block types: {t:'text', text}  (same markup as data.js: \\x01 = bold heading line)
             {t:'table', head:[...], rows:[[...]], style:'cards'|'grid'}"""
import json, re, sys
from pathlib import Path
import pdfplumber

pdf = pdfplumber.open(sys.argv[1])
out = Path(__file__).resolve().parent.parent
NOISE = re.compile(r'^\s*IRPG\b.*$|^\s*\d+\s+of\s+122\s*$')
BUL = '•○◦□☐'

def lines_of(page_or_crop):
    """Text lines top to bottom: bold-only lines get \\x01, wrapped lines are indented two spaces."""
    ls = page_or_crop.extract_text_lines(layout=False, strip=True, return_chars=True)
    if not ls: return []
    left = min(l['x0'] for l in ls)
    res = []
    for l in ls:
        t = re.sub(r'\s+', ' ', l['text']).strip()
        if not t or NOISE.match(t): continue
        chars = [c for c in l['chars'] if c['text'].strip()]
        bold = chars and all('bold' in c['fontname'].lower() or 'Bd' in c['fontname'] for c in chars)
        indent = '  ' if (l['x0'] - left) > 6 and not t[0] in BUL else ''
        res.append(('\x01' + t) if bold else indent + t)
    return res

def page_blocks(n, table_style='cards', bbox=None, strip_bottom=34):
    pg = pdf.pages[n - 1]
    pg = pg.crop((0, 0, pg.width, pg.height - strip_bottom))
    if bbox: pg = pg.crop(bbox)
    tables = sorted(pg.find_tables(), key=lambda t: t.bbox[1])
    zones = [(t.bbox[0] - 2, t.bbox[1] - 3, t.bbox[2] + 2, t.bbox[3] + 3) for t in tables]
    # text outside every table zone (zones padded so edge text can't leak or interleave with cell text)
    rest = pg.filter(lambda o: not (o['object_type'] == 'char' and any(
        z[0] <= (o['x0'] + o['x1']) / 2 <= z[2] and z[1] <= (o['top'] + o['bottom']) / 2 <= z[3] for z in zones)))
    items = []
    for l in rest.extract_text_lines(layout=False, strip=True, return_chars=True):
        items.append((l['top'], 'line', l))
    for t, z in zip(tables, zones):
        items.append((t.bbox[1], 'table', t))
    items.sort(key=lambda i: i[0])
    blocks, cur = [], []
    def flush():
        nonlocal cur
        if cur: blocks.append({'t': 'text', 'text': '\n'.join(cur)}); cur = []
    bullet_x = None
    for _, kind, o in items:
        if kind == 'table':
            flush(); bullet_x = None
            blocks.append({'t': 'table', 'rows': [[(c or '') for c in r] for r in o.extract()], 'style': table_style})
            continue
        t = re.sub(r'\s+', ' ', o['text']).strip()
        if not t or NOISE.match(t): continue
        chars = [c for c in o['chars'] if c['text'].strip()]
        bold = chars and all('bold' in c['fontname'].lower() or 'Bd' in c['fontname'] for c in chars)
        is_bullet = t[0] in BUL or re.match(r'^(o|\d{1,2}\.)\s', t)
        indent = ''
        if is_bullet: bullet_x = o['x0']
        elif bullet_x is not None and o['x0'] >= bullet_x + 3 and not bold: indent = '  '   # wrapped line of the bullet above
        else: bullet_x = None
        cur.append(('\x01' + t) if bold else indent + t)
    flush()
    return blocks

def clean_cell(c, keep=False):
    c = c.replace('­', '')
    if keep: return '\n'.join(' '.join(x.split()) for x in c.split('\n') if x.strip())
    return ' '.join(c.split())

if __name__ == '__main__':
    for n in (int(a) for a in sys.argv[2:]):
        print('=== pdf page', n)
        for b in page_blocks(n):
            if b['t'] == 'text': print('TEXT:', repr(b['text'][:300]))
            else: print('TABLE', len(b['rows']), 'x', len(b['rows'][0]), json.dumps(b['rows'][:3], ensure_ascii=False)[:400])
