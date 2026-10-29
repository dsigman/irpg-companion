#!/usr/bin/env python3
"""Builds tables.js from the IRPG PDF and verifies every word against the PDF text layer.
Usage: python3 tools/table_recipes.py IRPG.pdf
tables.js: self.TABLES[sectionId] = [blocks]; block = {t:'text', text} | {t:'table', style, head, rows|cols}
styles: cards (first column is the card title), grid (real table), columns (side-by-side lists, stacked on phones)."""
import json, re, subprocess, sys
from collections import Counter
from pathlib import Path
PDF = sys.argv[1]
sys.argv = sys.argv[:2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_tables as bt

OUT = Path(__file__).resolve().parent.parent
J = lambda c: ' '.join(str(c).split())
def text(*ls): return {'t': 'text', 'text': '\n'.join(ls)}
def table(rows, head=None, style='cards', breaks=()):
    rows = [[(c if i in breaks else J(c)) for i, c in enumerate(r)] for r in rows]
    return {'t': 'table', 'style': style, 'head': [J(h) for h in head] if head else None, 'rows': rows}
def blocks(n, bbox=None): return bt.page_blocks(n, bbox=bbox)
def tx(n, bbox=None): return '\n'.join(b['text'] for b in blocks(n, bbox) if b['t'] == 'text')
def tabs(n, bbox=None): return [b for b in blocks(n, bbox) if b['t'] == 'table']
def bbox_for(n, x0=0, x1=1, y0=0, y1=None):
    pg = bt.pdf.pages[n - 1]
    return (pg.width * x0, y0, pg.width * x1, y1 if y1 else pg.height - 34)
def cell_list(c):
    items = []
    for ln in c.split('\n'):
        ln = ln.strip()
        if not ln: continue
        if ln[0] in bt.BUL: items.append(ln.lstrip(bt.BUL + ' ').strip())
        elif items: items[-1] += ' ' + ln
        else: items.append(ln)
    return items
def after(s, marker): return s.split(marker, 1)[1]
def before(s, marker): return s.split(marker, 1)[0]
def bullets(ls): return ['• ' + l for l in ls]

R, PAGES = {}, {}

# ---- Safety Zones (p. 6)
t = tx(22)
R['safety-zones'] = [
    text(before(t, 'Flame Separation Distance Area in').rstrip()),
    table([['10’', '40’', '1/10 acre'], ['20’', '80’', '½ acre'], ['50’', '200’', '3 acres'],
           ['100’', '400’', '12 acres'], ['200’', '800’', '46 acres']],
          head=['Flame Height', 'Separation Distance (firefighters to flames)', 'Area in Acres*'], style='grid'),
    text('*Area in acres' + after(t, '*Area in acres').rstrip()),
]
PAGES['safety-zones'] = [22]

# ---- Indicators of Incident Complexity (pp. 8-10)
def complexity(n):
    out = []
    for b in blocks(n):
        if b['t'] == 'text': out.append(b); continue
        g, s = b['rows'][1]
        out.append({'t': 'table', 'style': 'columns', 'head': [J(b['rows'][0][0]), J(b['rows'][0][1])], 'cols': [cell_list(g), cell_list(s)]})
    return out
b26 = bt.pdf.pages[25]
ops_l = tx(26, bbox_for(26, 0, 0.5, 97, 168)).split('\n')
ops_r = tx(26, bbox_for(26, 0.5, 1, 97, 168)).split('\n')
head26 = tx(26, bbox_for(26, 0, 1, 0, 96))
tail26_fire = tx(26, bbox_for(26, 0, 1, 168, 190))
night = tx(26, bbox_for(26, 0, 1, 190))
night = '\n'.join(('  \u25cb ' + l[2:]) if l.startswith('o ') else l for l in night.split('\n'))
def join_wraps(ls):
    out = []
    for l in ls:
        if l.startswith('\x01') or not out or l[:1] in bt.BUL or l.startswith('o '): out.append(l.strip())
        else: out[-1] += ' ' + l.strip()
    return out
L = join_wraps(ops_l)
Rt = join_wraps(ops_r)
c24 = complexity(24); c25 = complexity(25)
c24.insert(1, text('\x01Type 5 Incident Complexity Indicators')); c25.insert(0, text('\x01Type 3 Incident Complexity Indicators*'))
R['complexity'] = c24 + c25 + [
    text(head26, *L,
         Rt[0],
         *['  ○ ' + x.lstrip('○ ').strip() for x in Rt[1:5]], *Rt[5:], tail26_fire, night)]
PAGES['complexity'] = [24, 25, 26]

# ---- Fire Danger Ratings (p. 39)
R['danger-ratings'] = [text(tx(55))]
PAGES['danger-ratings'] = [55]

# ---- Important Winds (pp. 41-42)
w57 = blocks(57)
t57 = [b for b in w57 if b['t'] == 'table'][0]
w58 = blocks(58)
t58 = [b for b in w58 if b['t'] == 'table'][0]
R['winds'] = [
    text(w57[0]['text']), table(t57['rows'], style='cards'),
    text(w58[0]['text']), table(t58['rows'], style='cards'),
    text('Interpreting the winds you measure: Winds you measure on the fireline may differ significantly from what is in your forecast. Use Important Winds for Interpreting Forecasts (page 41) to consider when significant changes might happen and to determine if a new forecast is needed for your location.'),
    table([['Flat or gently rolling terrain', 'Typically feel weak surface (20’) winds', 'Typically feel strong surface (20’) winds'],
           ['Hilly or mountainous terrain', 'Surface (20’) winds dominated by local winds (slope/valley winds or land/sea breezes)',
            'Surface (20’) winds will be a complex and changing combination of general and local windspeeds and directions']],
          head=['Surface Wind at Your Location', 'Weak Forecast Winds', 'Strong Forecast Winds'], style='cards'),
]
PAGES['winds'] = [57, 58]

# ---- Visual Estimate of Surface Windspeed (p. 43)
b59 = blocks(59)
tw = [b for b in b59 if b['t'] == 'table'][0]
R['wind-estimate'] = [text(b59[0]['text']), table(tw['rows'][1:], head=tw['rows'][0], style='cards'),
                      text([b for b in b59 if b['t'] == 'text'][-1]['text'])]
PAGES['wind-estimate'] = [59]

# ---- FFM / PIG (pp. 44-48): text + upright images of the (picture) tables
t60 = tx(60, bbox_for(60, 0, 1, 0, 168))
R['ffm-pig'] = [text(t60), text('\x01For Nighttime Estimates:', '\u2022 Use Table A to obtain a Reference Fuel Moisture Value.', '\u2022 Add 5 to the value that you get in Table A. This is your nighttime fuel moisture.'), {'t': 'images', 'images': ['pages/u60.jpg', 'pages/u61.jpg', 'pages/u62.jpg', 'pages/u63.jpg', 'pages/u64.jpg'],
                           'note': 'The fuel moisture and ignition tables are printed as pictures; shown here turned upright. Tap to zoom.'}]
PAGES['ffm-pig'] = [60, 61, 62, 63, 64]

# ---- FFM and fire behavior (p. 49), observations (p. 50)
b65 = blocks(65); t65 = [b for b in b65 if b['t'] == 'table'][0]
R['ffm-behavior'] = [text(b65[0]['text']) if b65[0]['t'] == 'text' else text(''),
                     table([r for r in t65['rows'][1:]], head=t65['rows'][0], style='cards', breaks=(1,)),
                     text([b for b in b65 if b['t'] == 'text'][-1]['text'])]
b66 = blocks(66); t66 = [b for b in b66 if b['t'] == 'table'][0]
R['behavior-obs'] = [text(b66[0]['text']), table(t66['rows'][1:], head=t66['rows'][0], style='cards'),
                     text([b for b in b66 if b['t'] == 'text'][-1]['text'])]
PAGES['ffm-behavior'] = [65]; PAGES['behavior-obs'] = [66]

# ---- HazMat Classification for Fixed Facilities (p. 56)
pg72 = bt.pdf.pages[71]
def col72(x0, x1, y0, y1): return tx(72, (pg72.width * x0, y0, pg72.width * x1, y1)).split('\n')
ITEM = re.compile(r'^(\d\s|[A-Z]{1,4}\s\u2013|\u2013)')
def items72(ls):
    out = []
    for l in ls:
        if l.startswith('\x01'): out.append(l)
        elif ITEM.match(l.strip()) or not out or out[-1].startswith('\x01'): out.append('\u2022 ' + l.strip())
        else: out[-1] += ' ' + l.strip()
    return out
hl = items72(col72(0, 0.5, 70, 240)); hr = items72(col72(0.5, 1, 70, 240))
sl = items72(col72(0, 0.5, 240, 344)); sr = items72(col72(0.5, 1, 240, 344))
sl = [l.replace('\u2022 \u2013 Radioactive', '\u2022 \u2622 \u2013 Radioactive') for l in sl]
R['hazmat-fixed'] = [text('\x01HazMat Classification for Fixed Facilities', '\x01Based on NFPA 704'),
                     text(*hl), text(*hr), text(*sl), text(*sr)]
PAGES['hazmat-fixed'] = [72]

# ---- Weight estimates (pp. 72-73)
l88 = [l for l in tx(88).split('\n')]
rows = []
for l in l88:
    m = re.match(r'^(.*\S)\s+(\d+\s*lbs\.?)$', l.strip())
    if m: rows.append([m.group(1), m.group(2)])
R['weights'] = [text('\x01Weight Estimates', '(use only if scale is not available)'), table(rows, head=['Item', 'Weight'], style='grid'), text(tx(89))]
PAGES['weights'] = [88, 89]

# ---- Retardant coverage (p. 77)
b93 = blocks(93); t93 = [b for b in b93 if b['t'] == 'table'][0]
R['retardant-coverage'] = [text(b93[0]['text']), table(t93['rows'][1:], head=t93['rows'][0], style='grid', breaks=(1,))]
PAGES['retardant-coverage'] = [93]

# ---- Engine / water tender typing (p. 89): one card per type
b105 = blocks(105); tt = [b for b in b105 if b['t'] == 'table']
def types_from(t, label_rows=2):
    rows = t['rows']; hdr_group = rows[0]; hdr_num = rows[1]
    groups, cur = [], ''
    for i, c in enumerate(hdr_group):
        if J(c): cur = J(c)
        groups.append(cur)
    cards = []
    return rows, hdr_group, hdr_num
cards = []
for t_i, t in enumerate(tt):
    rows = t['rows']
    grp = []; cur = ''
    for c in rows[1]:
        if J(c): cur = J(c)
        grp.append(cur)
    # rows[0] = 'Engine Type' / 'Water Tender Type'; rows[1] = group row; rows[2] = numbers
    nums = rows[2]; body = rows[3:]
    for ci in range(1, len(nums)):
        title = f'{J(rows[0][1]) if J(rows[0][1]) else J(rows[0][0])}'
        cards.append((t_i, f'{J(rows[0][next(i for i,c in enumerate(rows[0]) if J(c))])} {grp[ci]} {J(nums[ci])}',
                      [[J(r[0]), J(r[ci])] for r in body]))
R['engine-typing'] = [text('\x01NWCG Engine Typing Standard')]
for t_i, title, rr in cards:
    if t_i == 1 and not any(isinstance(b, dict) and b.get('title') == 'wt' for b in R['engine-typing']):
        R['engine-typing'].append(text('\x01NWCG Water Tender Typing Standards')); R['engine-typing'].append({'t': 'mark', 'title': 'wt'})
    R['engine-typing'].append({'t': 'table', 'style': 'cards', 'head': None, 'single': True, 'title': title, 'rows': rr})
R['engine-typing'] = [b for b in R['engine-typing'] if b.get('t') != 'mark']
R['engine-typing'].append(text('Source: NWCG Standards for Wildfire Resource Typing, PMS 200'))
PAGES['engine-typing'] = [105]

# ---- High pressure pump (pp. 90-91) and troubleshooting (pp. 92-94)
R['hp-pump'] = [text(tx(106)), text(tx(107))]
PAGES['hp-pump'] = [106, 107]
hp = []
for n in (108, 109, 110):
    for b in blocks(n):
        if b['t'] == 'table':
            merged = []
            for r in b['rows'][1:]:
                if merged and (not J(r[0]) or not J(r[1])):          # continuation of a wrapped cell
                    merged[-1] = [J(merged[-1][0] + ' ' + r[0]), J(merged[-1][1] + ' ' + r[1])]
                else: merged.append([J(r[0]), J(r[1])])
            hp.append(table(merged, head=b['rows'][0], style='grid'))
        else: hp.append(b)
R['hp-troubleshoot'] = hp
PAGES['hp-troubleshoot'] = [108, 109, 110]

# ---- Average perimeter / fire size class (p. 95)
b111 = blocks(111); tp = [b for b in b111 if b['t'] == 'table'][0]
rows = []
for r in tp['rows'][1:]:
    if J(r[0]): rows.append([r[0], r[1]])
for r in tp['rows'][1:]:
    if J(r[2]): rows.append([r[2], r[3]])
t111 = [b for b in b111 if b['t'] == 'text'][-1]['text'].split('\n')
fs = []
for l in t111:
    m = re.match(r'^\s*([A-G])\s+(.+)$', l)
    if m: fs.append([m.group(1), m.group(2)])
R['perimeter-chains'] = [text(b111[0]['text']) if b111[0]['t'] == 'text' else text('\x01Average Perimeter in Chains'),
                         table(rows, head=['Acres', 'Perimeter'], style='grid'),
                         text('1 Chain = 66 feet', '\x01Fire Size Class'), table(fs, head=['Class', 'Fire Size'], style='grid')]
PAGES['perimeter-chains'] = [111]

# ---- Phonetic alphabet (p. 104)
rows = []
for l in tx(120).split('\n'):
    m = re.match(r'^([A-Z]) (\S+) (\S+)$', l.strip())
    if m: rows.append(list(m.groups()))
R['phonetic'] = [text('\x01Phonetic Alphabet'), table(rows, head=['Letter', 'Law Enforcement', 'International'], style='grid')]
PAGES['phonetic'] = [120]

# ---- Patient assessment (p. 108)
pg124 = bt.pdf.pages[123]
lcol = tx(124, bbox_for(124, 0, 0.62, 55, 322)); rcol = tx(124, bbox_for(124, 0.62, 1, 55, 322))
fix = lambda t: t.replace('\x01rescue breathing.', '  rescue breathing.')
tail = tx(124, bbox_for(124, 0, 1, 322))
R['patient-assessment'] = [text('\x01Patient Assessment'), text(fix(lcol)), text(fix(rcol)), text(tail)]
PAGES['patient-assessment'] = [124]

# ---- Triage (p. 116)
R['triage'] = [text('\x01Multi-Casualty Triage System'),
    table([['Red', 'Immediate', 'Serious, life-threatening injury.\nBreathing but unconscious; respirations more than 30/minute.\nRadial pulse absent, capillary refill more than 2 seconds.\nOr can’t follow simple commands.'],
           ['Yellow', 'Delayed', 'Treatment and transport delayed.\nRespirations less than 30/minute.\nRadial pulse present, capillary refill less than 2 seconds.\nAnd can follow simple commands.'],
           ['Green', 'Minor', 'All walking wounded; treatment can be delayed.'],
           ['Black', 'Deceased/ Dying', 'Dead or with injuries not compatible with life.\nNo respirations after repositioning airway.']],
          head=['Color', 'Priority', 'Description'], style='cards', breaks=(2,))]
PAGES['triage'] = [132]

# ---------------- verification against the PDF text layer
def norm_tokens(s):
    s = s.replace('\x01', ' ').replace('\x02', ' ')
    s = re.sub(r'[•○◦☐□☢]', ' ', s)
    return [t for t in re.findall(r"[A-Za-z0-9]+(?:['’\.\-/][A-Za-z0-9]+)*", s.lower())]
def block_text(b):
    if b['t'] == 'text': return b['text']
    if b['t'] == 'images': return ''
    parts = []
    if b.get('head'): parts += b['head']
    if b.get('title'): parts.append(b['title'])
    if 'cols' in b: parts += b['head'] + [x for c in b['cols'] for x in c]
    for r in b.get('rows', []): parts += [c for c in r]
    return ' '.join(parts)
def pdf_tokens(pages):
    toks = []
    for p in pages:
        raw = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-raw', PDF, '-'], capture_output=True, text=True).stdout
        raw = '\n'.join(l for l in raw.split('\n') if not re.match(r'^\s*IRPG\b', l) and not re.match(r'^\s*\d+ of 122\s*$', l) and l.strip() != 'NOTES')
        toks += norm_tokens(raw)
    return toks
ok = True
for sid, bl in R.items():
    mine = Counter(norm_tokens(' '.join(block_text(b) for b in bl)))
    theirs = Counter(pdf_tokens(PAGES[sid]))
    miss = theirs - mine; extra = mine - theirs
    flag = bool(miss or extra)
    print(f"{'DIFF' if flag else 'ok  '} {sid}" + (f"  missing={dict(list(miss.items())[:12])} extra={dict(list(extra.items())[:12])}" if flag else ''))
    ok = ok and not flag
(OUT / 'tables.js').write_text('self.TABLES = ' + json.dumps(R, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
print('written tables.js;', 'all verified' if ok else 'REVIEW DIFFS')
