#!/usr/bin/env python3
"""Build data.js from the NWCG IRPG PDF (PMS 461, Jan 2025): python3 tools/build_data.py IRPG.pdf
Text is extracted verbatim with pdftotext; only page footers/headers are removed.
Sections listed in GRAPHIC also get page images (needs pdftoppm) because diagrams don't survive text extraction."""
import json, re, subprocess, sys
from pathlib import Path

pdf = sys.argv[1]
out = Path(__file__).resolve().parent.parent
ARABIC, ROMAN = 16, 3  # pdf page = printed page + offset

# (id, title, category, start page, 'r' for roman)
S = [
 ('sizeup-report','Sizeup Report','Quick Reference',2,None),
 ('briefing-checklist','Briefing Checklist','Quick Reference',139,None),
 ('fire-orders','10 Standard Firefighting Orders','Quick Reference',140,None),
 ('watch-outs','18 Watch Out Situations','Quick Reference',140,None),
 ('about','About this Guide / Publication Information','Quick Reference',3,None),
 ('op-leadership','Operational Leadership','Operational Leadership',5,'r'),
 ('duty','Duty','Operational Leadership',6,'r'),
 ('respect','Respect','Operational Leadership',7,'r'),
 ('integrity','Integrity','Operational Leadership',8,'r'),
 ('comm-resp','Communication Responsibilities / Leader’s Intent','Operational Leadership',9,'r'),
 ('human-factors','Human Factor Barriers to Situation Awareness','Operational Leadership',10,'r'),
 ('stress','Firefighter Stress Management','Operational Leadership',12,'r'),
 ('aar','After Action Review (AAR)','Operational Leadership',13,'r'),
 ('risk-mgmt','Risk Management Process','Operational Engagement',1,None),
 ('medical-plan','Planning for Medical Emergencies','Operational Engagement',2,None),
 ('common-denominators','Common Denominators of Fire Behavior on Tragedy Fires','Operational Engagement',3,None),
 ('tactical-hazards','Common Tactical Hazards','Operational Engagement',4,None),
 ('lces','LCES','Operational Engagement',5,None),
 ('safety-zones','Safety Zones','Operational Engagement',6,None),
 ('downhill','Downhill Fireline Construction Checklist','Operational Engagement',7,None),
 ('complexity','Indicators of Incident Complexity','Operational Engagement',8,None),
 ('wui','Wildland Urban Interface (WUI) Firefighting','Operational Engagement',11,None),
 ('thunderstorm','Thunderstorm Safety','Specific Hazards',17,None),
 ('refuse-risk','How to Properly Refuse Risk','Specific Hazards',18,None),
 ('hazard-tree','Hazard Tree Safety','Specific Hazards',20,None),
 ('powerline','Powerline Safety','Specific Hazards',22,None),
 ('roadside','Roadside Response Safety','Specific Hazards',24,None),
 ('uxo','Unexploded Ordnance Safety','Specific Hazards',25,None),
 ('oil-gas','Oil and Gas Site Safety','Specific Hazards',26,None),
 ('smoke','Smoke Hazards and Mitigation','Specific Hazards',28,None),
 ('smoke-transport','Smoke and Transportation Safety','Specific Hazards',29,None),
 ('last-resort','Last Resort Survival','Specific Hazards',30,None),
 ('fire-assessment','Fire Assessment Process','Fire Environment',33,None),
 ('look-up','Look Up, Down, and Around','Fire Environment',34,None),
 ('smoke-column','Interpret the Smoke Column','Fire Environment',38,None),
 ('danger-ratings','Fire Danger Ratings and Interpretations','Fire Environment',39,None),
 ('critical-weather','Critical Fire Weather','Fire Environment',40,None),
 ('winds','Important Winds for Interpreting Forecasts','Fire Environment',41,None),
 ('wind-estimate','Visual Estimate of Surface Windspeed','Fire Environment',43,None),
 ('ffm-pig','Fine Fuel Moisture (FFM) and Probability of Ignition (PIG)','Fire Environment',44,None),
 ('ffm-behavior','Fine Fuel Moisture and Fire Behavior','Fire Environment',49,None),
 ('behavior-obs','Fire Behavior Observations & Interpretations','Fire Environment',50,None),
 ('forecast','In Your Fire Weather Forecast','Fire Environment',51,None),
 ('vehicle-accident','Vehicle Accident Operations','All Hazard Response',53,None),
 ('hazmat-ops','HazMat Incident Operations','All Hazard Response',54,None),
 ('hazmat-isolation','HazMat Isolation Distances','All Hazard Response',55,None),
 ('hazmat-fixed','HazMat Classification for Fixed Facilities','All Hazard Response',56,None),
 ('disaster','Local Disaster Response','All Hazard Response',57,None),
 ('all-hazard','All Hazard Incident Response','All Hazard Response',58,None),
 ('structure-marking','Structure Hazard Marking System','All Hazard Response',59,None),
 ('aviation-checklist','Aviation User Checklist','Aviation',61,None),
 ('aviation-watchouts','Aviation Watch Out Situations','Aviation',62,None),
 ('heli-briefing','Helicopter Passenger Briefing and PPE','Aviation',63,None),
 ('heli-landing-area','Helicopter Landing Area Selection','Aviation',66,None),
 ('one-way-helispot','One-Way Helispot','Aviation',67,None),
 ('two-way-helispot','Two-Way Helispot','Aviation',68,None),
 ('longline','Longline Mission','Aviation',69,None),
 ('hand-signals','Helicopter Hand Signals','Aviation',70,None),
 ('paracargo','Paracargo Operations Safety','Aviation',71,None),
 ('weights','Weight Estimates','Aviation',72,None),
 ('directing-drops','Directing Retardant and Bucket Drops','Aviation',74,None),
 ('airtanker-principles','Principles for Airtanker and Water Scooper Use','Aviation',75,None),
 ('retardant-reminders','Retardant and Suppressant Use Reminders','Aviation',76,None),
 ('retardant-coverage','Recommended Retardant Coverage Levels','Aviation',77,None),
 ('aircraft-mishap','Aircraft Mishap Response Actions','Aviation',78,None),
 ('safecom','SAFECOM Reporting System','Aviation',79,None),
 ('uas','Unmanned Aircraft Systems (UAS) in Wildland Fire Operations','Aviation',80,None),
 ('direct-attack','Strategy – Direct Attack','Other References',83,None),
 ('indirect-attack','Strategy – Indirect Attack','Other References',84,None),
 ('fireline-location','Fireline Location','Other References',85,None),
 ('chainsaw','Chainsaw Operations','Other References',86,None),
 ('heavy-equipment','Working with Heavy Equipment','Other References',87,None),
 ('water-delivery','Water Delivery Information','Other References',88,None),
 ('engine-typing','NWCG Engine and Water Tender Typing Standards','Other References',89,None),
 ('hp-pump','High Pressure Pump Information','Other References',90,None),
 ('hp-troubleshoot','Troubleshooting a High Pressure Pump','Other References',92,None),
 ('perimeter-chains','Average Perimeter in Chains / Fire Size Class','Other References',95,None),
 ('line-spike','Line Spike','Other References',96,None),
 ('min-impact','Minimum Impact Strategy Tactics','Other References',98,None),
 ('chem-misapplication','Reporting Fire Chemical Misapplication','Other References',100,None),
 ('aquatic-invasive','Aquatic Invasive Species','Other References',101,None),
 ('origin-protection','Fire Origin Protection Checklist','Other References',102,None),
 ('fire-info','Fire Information is Everyone’s Job','Other References',103,None),
 ('phonetic','Phonetic Alphabet','Other References',104,None),
 ('medical-guidelines','Emergency Medical Care Guidelines','Emergency Medical Care',107,None),
 ('patient-assessment','Patient Assessment','Emergency Medical Care',108,None),
 ('specific-treatments','Specific Treatments','Emergency Medical Care',110,None),
 ('cpr','CPR','Emergency Medical Care',111,None),
 ('heat-injury','Heat-Related Injury','Emergency Medical Care',112,None),
 ('burns','Burn Injuries','Emergency Medical Care',114,None),
 ('triage','Multi-Casualty Triage System','Emergency Medical Care',116,None),
 ('fatality','Fatality Procedures','Emergency Medical Care',117,None),
 ('heli-extraction','Helicopter Extraction Operations','Emergency Medical Care',118,None),
 ('medical-report','Medical Incident Report','Emergency Medical Care',120,None),
]
# Sections whose layout is a table/diagram: shown preformatted, plus page images when the content is graphical.
MONO = {'danger-ratings','winds','wind-estimate','ffm-pig','ffm-behavior','behavior-obs','hazmat-fixed','weights','retardant-coverage',
        'engine-typing','hp-pump','hp-troubleshoot','perimeter-chains','phonetic','triage','complexity','patient-assessment','safety-zones','medical-report'}
IMAGES = {'hazmat-isolation','water-delivery','heavy-equipment','smoke-transport','retardant-reminders','critical-weather','structure-marking','heli-landing-area','one-way-helispot','two-way-helispot','longline','hand-signals','paracargo',
          'wind-estimate','smoke-column','look-up','safety-zones','hazard-tree','hazmat-isolation','triage','burns'}
SPECIAL = {  # explicit pdf page lists (cover pages share one pdf page)
 'about':[3,138], 'sizeup-report':[2],'briefing-checklist':[139],'fire-orders':[140],'watch-outs':[140],
}

def roman(n):
    return ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv'][n-1]
def printed(p):
    # label as printed in the guide (arabic pages = pdf page - 16, front matter = roman)
    if 17 <= p <= 137: return str(p - 16)
    if 8 <= p <= 16: return roman(p - 3)
    return {2:'inside front cover',3:'intro',138:'publication info',139:'inside back cover',140:'back cover'}.get(p, f'PDF p.{p}')

def pdf_page(n, kind):
    return n + (ROMAN if kind == 'r' else ARABIC)

# end pages: up to the page before the next *main-body* section (cover items handled by SPECIAL)
body = [s for s in S if s[0] not in SPECIAL]
ends = {}
for i, s in enumerate(body):
    start = pdf_page(s[3], s[4])
    nxt = pdf_page(body[i+1][3], body[i+1][4]) if i+1 < len(body) else 137 + 1
    ends[s[0]] = max(start, nxt - 1)

NOISE = [re.compile(p) for p in (
    r'^\s*IRPG(\s+[–-].*)?\s*(\d+\s+of\s+122)?\s*$', r'^\s*IRPG\s+[ivx]+\s*$', r'^\s*\d+\s+of\s+122\s*$',
    r'^\s*[A-Z ]{4,}\s*\([a-z ]+ pages\)\s*$', r'^\s*.{0,40}\([\w ]+pa\s?ges\)\s*$', r'^\s*\f?\s*$')]
def bold_lines(n):
    # whole-element bold text on the page = headings; layout text lines equal to one of these get marked
    x = subprocess.run(['pdftohtml','-xml','-i','-f',str(n),'-l',str(n),'-stdout',pdf],capture_output=True,text=True,check=True).stdout
    found = set()
    for m in re.finditer(r'<text [^>]*>\s*<b>(.*?)</b>\s*</text>', x):
        t = ' '.join(re.sub(r'<[^>]+>', '', m.group(1)).replace('&amp;','&').replace('&#34;','"').replace('&lt;','<').replace('&gt;','>').split())
        if t: found.add(t)
    return found

def bold_labels(n):
    # a bold lead-in such as 'Determining Factor:' at the start of a line that continues in regular type
    x = subprocess.run(['pdftohtml','-xml','-i','-f',str(n),'-l',str(n),'-stdout',pdf],capture_output=True,text=True,check=True).stdout
    found = set()
    for m in re.finditer(r'<text [^>]*>\s*<b>(.*?)</b>(.+?)</text>', x):
        lab = ' '.join(re.sub(r'<[^>]+>', '', m.group(1)).replace('&amp;','&').split())
        rest = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        if lab.endswith(':') and rest and len(lab) < 60: found.add(lab)
    return found

def page_text(n, mark=True):
    t = subprocess.run(['pdftotext','-f',str(n),'-l',str(n),'-layout',pdf,'-'],capture_output=True,text=True,check=True).stdout
    lines = [l.rstrip() for l in t.replace('\f','').split('\n')]
    # drop footer/header noise, keep blank lines inside the text
    keep = [l for l in lines if not (l.strip() and any(p.match(l) for p in NOISE))]
    if mark:
        bold = bold_lines(n); labels = bold_labels(n)
        def tag(l):
            norm = ' '.join(l.split())
            if norm in bold: return '\x01' + l.strip()
            if not re.match(r'\s*[\u2022\u2610\u25a1\u25cb\-\u2013]|\s*\d{1,2}\.\s', l):
                for lab in labels:
                    if norm.startswith(lab) and len(norm) > len(lab) + 2: return '\x02' + l.strip()
            return l
        keep = [tag(l) for l in keep]
    while keep and not keep[0].strip(): keep.pop(0)
    while keep and not keep[-1].strip(): keep.pop()
    return '\n'.join(keep)

GLYPHS = {'\uf0e8': '\u2192', '\uf0a7': '\u2022'}  # Wingdings arrow and square bullet
STRUCT = [  # Structure Hazard Marking System: symbols are drawn marks, so describe them in words
    ('\uf06f\u2044 Structure is significantly', '[Box with one slash] Structure is significantly'),
    ('\uf06f Structure is safe', '[Empty box] Structure is safe'),
    ('\uf06f Structure is unsafe', '[Box with X] Structure is unsafe'),
    ('\uf0cf\n', ''),
    ('\uf0e7 Entrance', '[Arrow] Entrance'),
]
sections = []
for sid, title, cat, n, kind in S:
    pages = SPECIAL.get(sid) or list(range(pdf_page(n, kind), ends[sid] + 1))
    text = '\n\n'.join(page_text(p, sid not in MONO) for p in pages)
    if sid not in MONO:
        L = text.split('\n')
        first = L[0].strip() if L else ''
        if first and L[0][0] not in '\x01\x02' and len(first) < 60 and not re.search(r'[.,;]$', first) and not re.match(r'[\u2022\u2610\u25a1\u25cb\-\u2013]\s', first):
            L[0] = '\x01' + first
        text = '\n'.join(L)
        text = re.sub(r'\n+(\x01)?NOTES\s*$', '', text)
    if sid == 'structure-marking':
        for a, b in STRUCT: text = text.replace(a, b)
    for a, b in GLYPHS.items(): text = text.replace(a, b)
    if sid == 'fire-orders': text = text.split('18 WATCH OUT')[0].rstrip()
    if sid == 'watch-outs': text = '\x0118 WATCH OUT' + text.split('18 WATCH OUT',1)[1]
    sec = {'id': sid, 'title': title, 'category': cat, 'pages': printed(pages[0]) if len(pages)==1 else f'{printed(pages[0])}–{printed(pages[-1])}', 'text': text}
    if sid in MONO: sec['mono'] = True
    sec['images'] = [f'pages/p{p}.jpg' for p in pages]  # printed pages, always shown as a fallback to the extracted text
    # text with inline checkboxes, nested 'o'/'-' markers on one line, or unmappable glyphs doesn't reflow faithfully:
    # open the printed page by default so the reader sees the real layout
    messy = any(len(re.findall(r'[\u2610\u25a1]', l)) > 1 or re.search(r'\s[o\u25cb\-]\s+[A-Z]', l) and l.lstrip()[:1] in '\u2610\u25a1\u2022\u25cb-' or re.search(r'[\ue000-\uf8ff]', l)
                for l in text.split('\n'))
    if sid in IMAGES or sid in MONO or messy: sec['openImages'] = True
    if messy: print('  messy ->', sid)
    sections.append(sec)

(out / 'pages').mkdir(exist_ok=True)
need = sorted({int(re.search(r'p(\d+)', im).group(1)) for s in sections for im in s.get('images', [])})
for p in need:
    subprocess.run(['pdftoppm','-f',str(p),'-l',str(p),'-jpeg','-jpegopt','quality=72','-r','150','-singlefile',pdf,str(out/'pages'/f'p{p}')],check=True)

import hashlib
body_json = json.dumps(sections, ensure_ascii=False, indent=1)
ver = hashlib.sha1(body_json.encode()).hexdigest()[:8]
js = ('// Generated by tools/build_data.py from NWCG IRPG (PMS 461, January 2025). Do not edit by hand.\n'
      f'self.DATA_VERSION = "{ver}";\n'
      'self.SECTIONS = ' + body_json + ';\n')
(out / 'data.js').write_text(js, encoding='utf-8')
print(len(sections), 'sections,', len(need), 'page images')
