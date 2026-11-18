#!/usr/bin/env python3
"""cs #716·AI — rebuild #711's all-languages voice casting page (d/e356228f) with every
newly sampled Cartesia voice playable inline.

Inputs (all read-only, gathered through Popty's own HTTP routes or the surface):
  p711.body.html     the published #711 page body (structure is kept as-is)
  reg.json           GET /api/voicelab/languages (Kai's signed key)
  final/<lang>.json  GET /api/voicelab/languages/<lang>/samples?voices=… after the prepare run
  summary.json       run-prepare.cjs summary (failures, no-line languages)
  published.json     cache: lab clip id -> published /d/<id>/file url (publish_clip appends)
Writes page.md. Publishing of clips is done by publish_clip (surface /api/publish-doc "file").
usage: build-page.py <workdir> <lab-clip-dir> <conv-token-env-name> <conv-id>
"""
import html, json, os, re, sys, urllib.request

work, clipdir, tokenvar, conv = sys.argv[1:5]
J = lambda p: json.load(open(os.path.join(work, p)))
reg = {l['code']: l for l in J('reg.json')['languages']}
summary = J('summary.json')
pubfile = os.path.join(work, 'published.json')
published = json.load(open(pubfile)) if os.path.exists(pubfile) else {}
TOKEN = os.environ[tokenvar]

def publish_clip(clip, title):
    if clip in published: return published[clip]
    path = os.path.join(clipdir, clip + '.mp3')
    body = json.dumps({'file': path, 'title': title, 'internal': True, 'conv_id': conv}).encode()
    req = urllib.request.Request('http://localhost:4317/api/publish-doc', data=body,
                                 headers={'Content-Type': 'application/json', 'x-cs-conv': TOKEN})
    r = json.load(urllib.request.urlopen(req))
    assert r.get('file', {}).get('type') == 'audio/mpeg', r
    published[clip] = r['fileUrl']
    json.dump(published, open(pubfile, 'w'))
    return r['fileUrl']

norm = lambda s: re.sub(r'\s+', ' ', s.replace(' — Cartesia', '')).strip()

# failures and no-line reasons from the run
failed = {}
noline = {}
for row in summary['log']:
    if row.get('skipped'): noline[row['lang']] = row.get('error') or 'no course, instruction or pod line in this language'
    for f in row.get('failed', []):
        failed[(row['lang'], f['voiceId'])] = 'Cartesia says the voice no longer exists (voice_not_found)' if 'voice_not_found' in f['error'] else f['error'][:120]
    if row.get('stopped') and row.get('missingAfter'): noline.setdefault(row['lang'] + ':stopped', row['stopped'])

final = {}
for f in os.listdir(os.path.join(work, 'final')):
    final[f[:-5]] = json.load(open(os.path.join(work, 'final', f)))

stats = {'new': 0, 'had': 0, 'unheard': []}
NEW_CLIPS = set(json.load(open(os.path.join(work, 'new-clips.json'))))

def voice_for(code, name, g):
    l = reg.get(code) or {}
    for c in l.get('candidates') or []:
        if c['kind'] == 'cartesia' and norm(c['name']) == name and (g == '?' or c['gender'] == g):
            return c
    return None

def player(code, name, g):
    """markdown fragment for one voice: a player, or the honest reason it has none."""
    c = voice_for(code, name, g)
    if not c:
        stats['unheard'].append((code, name, 'not in the Voice Lab registry'))
        return 'UNHEARD — not in the Voice Lab registry'
    vid = c['voiceId']
    s = (final.get(code) or {}).get('samples', {}).get(vid)
    if s:
        url = s['url']
        m = re.match(r'/api/voicelab/clip/([0-9a-f]{16})\.mp3$', url)
        if m:
            clip = m.group(1)
            fresh = clip in NEW_CLIPS
            stats['new' if fresh else 'had'] += 1
            return f"{'new sample' if fresh else 'lab sample'} [▶]({publish_clip(clip, f'{code} {name}')})"
        stats['had'] += 1
        return f'estate clip [▶]({url})'
    why = failed.get((code, vid)) or noline.get(code) or noline.get(code + ':stopped') or 'not sampled'
    stats['unheard'].append((code, name, why))
    return f'UNHEARD — {why}'

# ── HTML → markdown, section by section ────────────────────────────────────────
body = open(os.path.join(work, 'p711.body.html')).read()
body = body[body.find('<div class="fname">'):]
body = re.sub(r'<div class="fname">.*?</div>', '', body, count=1, flags=re.S)

def inline(s):
    s = re.sub(r'<audio[^>]*src="([^"]+)"[^>]*></audio>', lambda m: f' [▶]({m.group(1) if m.group(1).startswith("http") else BASE + m.group(1)})', s)
    s = re.sub(r'</?strong>', '**', s)
    s = re.sub(r'</?em>', '*', s)
    s = re.sub(r'<code>(.*?)</code>', r'`\1`', s)
    s = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', s)
    s = re.sub(r'<br\s*/?>', '  \n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s)

BASE = 'https://watson-1.tail4968cb.ts.net'
out = []
code = None
for tok in re.split(r'(<h2>.*?</h2>|<h3>.*?</h3>|<ul>.*?</ul>|<p>.*?</p>|\n)', body, flags=re.S):
    if not tok or tok == '\n': continue
    m = re.match(r'<h2>(.*?)</h2>', tok, re.S)
    if m:
        t = html.unescape(m.group(1)); out += ['', '---', '', '## ' + t, '']
        mm = re.search(r'\(([a-z_]+)\)$', t); code = mm.group(1) if mm else None
        fl = (final.get(code) or {}).get('line') if code else None
        if fl: out += [f"*Audition line for every new sample:* «{fl['text']}» — {fl.get('source','')}", '']
        continue
    if tok.startswith('<h3>'): out += ['', '### ' + inline(tok), '']; continue
    if tok.startswith('<ul>'):
        for li in re.findall(r'<li>(.*?)</li>', tok, re.S):
            mm = re.match(r'(.+?) · ([fm?]) · (.*?)— no free preview$', html.unescape(re.sub(r'<[^>]+>', '', li)).strip())
            if mm and code and 'Azure' not in li:
                out.append(f'- {mm.group(1)} · {mm.group(2)} · {mm.group(3).strip()} · {player(code, norm(mm.group(1)), mm.group(2))}')
            else:
                out.append('- ' + inline(li).replace('no free preview — pick by ear after a sample', 'sampled below — pick by ear'))
        out.append(''); continue
    t = inline(tok).strip()
    if not t: continue
    mm = re.match(r'\*Also native, no free preview \((\d+)\):\*\s*(.*)$', t, re.S)
    if mm and code:
        out += ['', f'*Also native ({mm.group(1)}) — sampled by #716·AI, UNHEARD by anyone but you:*', '']
        for nm, g, loc in re.findall(r'\s*(.+?) \(([fm?]), ([^)]*)\)(?:,|$)', mm.group(2)):
            out.append(f'- {nm.strip()} · {g} · {loc} · {player(code, norm(nm.strip()), g)}')
        out.append(''); continue
    out += [t.replace('no free preview — pick by ear after a sample', 'sampled below — pick by ear'), '']

# Telugu / Marathi: #711 pointed at d/7a3cf15b; add their native Cartesia voices inline.
md = '\n'.join(out)
for code_, pre in (('mar', 'mr'), ('tel', 'te')):
    l = reg[code_]
    rows = [f"*Native Cartesia voices, sampled by #716·AI (UNHEARD by anyone but you):*", '']
    for c in l['candidates']:
        if c['kind'] == 'cartesia' and (c.get('locale') or '').startswith(pre):
            rows.append(f"- {norm(c['name'])} · {c['gender']} · {c.get('locale')} · {player(code_, norm(c['name']), c['gender'])}")
    fl = (final.get(code_) or {}).get('line')
    head = f"*Audition line:* «{fl['text']}» — {fl.get('source','')}\n\n" if fl else ''
    md = re.sub(r'(## [^\n]*\(' + code_ + r'\)\n\n(?:\*Audition line[^\n]*\n\n)?)', lambda m: m.group(1) + ('' if fl and 'Audition line' in m.group(1) else head) + '\n'.join(rows) + '\n\n', md, count=1)

json.dump({'new': stats['new'], 'had': stats['had'], 'unheard': stats['unheard']}, open(os.path.join(work, 'page-stats.json'), 'w'), indent=1)
open(os.path.join(work, 'page.md'), 'w').write(md)
print(json.dumps({'new': stats['new'], 'had': stats['had'], 'unheard': len(stats['unheard'])}))
