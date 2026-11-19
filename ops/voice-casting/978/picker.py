#!/usr/bin/env python3
"""cs #978·AI — Kai's three-round voice picker, as tap-to-mark review-page payloads.

Data only: it never calls Popty, renders audio or writes casting. Every sample is a clip #716·AI
already published (/d/<id>/file); a voice without one is listed as a gap, never re-rendered.

  round1  --reg REG.json --e716 DIR --out OUT
          REG  = GET /api/voicelab/languages (tools/agent-admin/call.cjs --key kai), read live
          DIR  = #716 evidence page dir (final/<lang>.json, published.json, summary.json)
          writes OUT/voices.json (the manifest rounds 2-3 read), OUT/round1/<lang>.json payloads,
          OUT/gaps.json
  round2  --manifest voices.json --marks STATE.json [STATE.json …] --out DIR
  round3  --manifest voices.json --marks STATE.json [STATE.json …] --out DIR
          STATE = GET /api/review-page/state?id=<page id> (answers keyed by item id), one per page.
  podpool --manifest voices.json --marks1 R1STATE.json … --marks2 R2STATE.json … --out pod-pool.json
          Kai, 19 Nov 12:54Z: pods may use many Cartesia voices for different characters (the Learner
          need not be one character). Per language, the pod pool is every voice he marked 'like' in
          round 1 that did NOT become a target 1 / target 2 favourite in round 2. Data for pod casting
          to read later; this tool changes no pod casting.
  fetch   --pages PAGES.json --out DIR      saves each page's state as DIR/<lang>.json (env CS_CONV = x-cs-conv)
  post    --dir PAYLOAD_DIR --pages-out PAGES.json   POSTs each payload to /api/review-page (env CS_CONV)

The whole loop, from Kai's room (answers route there because every payload carries conv_id):
  picker.py fetch --pages round1-pages.json --out m1 && picker.py round2 --manifest voices.json --marks m1/*.json --out . \
    && picker.py post --dir round2 --pages-out round2-pages.json
  picker.py fetch --pages round2-pages.json --out m2 && picker.py round3 --manifest voices.json --marks m2/*.json --out . \
    && picker.py post --dir round3 --pages-out round3-pages.json

Which languages need a pick (round 1): a language with native Cartesia voices whose cast primary is
the 2026-09-04 mechanical draft ("no taste applied"), or whose cast voice Cartesia has withdrawn
(voice_not_found in #716's run). Slots: one male and one female target voice (the registry's
completeness rule: target 1 and target 2 are one of each); a known-only language needs the same two
for its known side. A language that is also the KNOWN side of a course (knownCourses > 0) needs a
known/presentation voice too, which round 3 picks from the chosen two.
"""
import argparse, json, os, re, sys

KAI_ROOM = '13b3da1c-705d-4a05-ab24-161a20e2ef7e'   # Kai's room: marks route back here
DRAFT = 'draft casting 2026-09-04'
GENDER = {'m': 'male', 'f': 'female'}
NAMES = {'ben': 'Bengali', 'bul': 'Bulgarian', 'ces': 'Czech', 'dan': 'Danish', 'deu_at': 'Austrian German', 'guj': 'Gujarati',
         'heb': 'Hebrew', 'hun': 'Hungarian', 'ind': 'Indonesian', 'kan': 'Kannada', 'mar': 'Marathi', 'nld': 'Dutch',
         'nor': 'Norwegian', 'pan': 'Punjabi', 'pol': 'Polish', 'ron': 'Romanian', 'rus': 'Russian', 'swe': 'Swedish',
         'tam': 'Tamil', 'tel': 'Telugu', 'tha': 'Thai', 'tur': 'Turkish', 'ukr': 'Ukrainian', 'ell': 'Greek'}
EXCLUDED = {'deu_at'}
LIKE, NO = 'like', 'no'
FAV, NOT = 'favourite', 'not this one'
KNOWN, PRES, NEITHER = 'known voice', 'presentation voice', 'neither'


def load(p): return json.load(open(p))
def dump(o, p):
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    json.dump(o, open(p, 'w'), ensure_ascii=False, indent=1)


def primary(lang, g):
    s = [x for x in lang['slots'].get(g, []) if x['rank'] == 0]
    return s[0] if s and s[0]['filled'] else None


def round1(a):
    reg = {l['code']: l for l in load(a.reg)['languages']}
    pub = load(os.path.join(a.e716, 'published.json'))
    summ = load(os.path.join(a.e716, 'summary.json'))
    gone = {(r['lang'], f['voiceId']) for r in summ['log'] for f in r.get('failed', []) if 'voice_not_found' in f['error']}
    langs, gaps = {}, []
    fdir = os.path.join(a.e716, 'final')
    finals = {f[:-5]: load(os.path.join(fdir, f)) for f in os.listdir(fdir) if f.endswith('.json')}
    for code, l in reg.items():
        cart = [c for c in l['candidates'] if c['kind'] == 'cartesia']
        if not cart or l['human']: continue
        slots = []
        for g in 'mf':
            p = primary(l, g)
            why = None
            if p is None: why = 'nothing cast'
            elif (code, p['voiceId']) in gone: why = f"cast voice {p['voiceName']} is GONE (Cartesia withdrew it)"
            elif (p.get('notes') or '').startswith(DRAFT): why = f"cast {re.sub(r'\s+', ' ', p['voiceName'])} is the 2026-09-04 mechanical draft"
            if why: slots.append({'gender': g, 'why': why, 'now': p and re.sub(r'\s+', ' ', p['voiceName'])})
        if not slots: continue
        fp = os.path.join(a.e716, 'final', code + '.json')
        fin = load(fp) if os.path.exists(fp) else {}
        line = (fin.get('line') or {})
        need = {x['gender'] for x in slots}
        voices = []
        for c in cart:
            v = {'voiceId': c['voiceId'], 'name': re.sub(r'\s+', ' ', c['name'].replace(' — Cartesia', '')).strip(), 'gender': c['gender'],
                 'accent': c.get('accent'), 'locale': c.get('locale') or c.get('accentLocale'),
                 'tagline': c.get('tagline'), 'description': c.get('description')}
            if c['gender'] in GENDER and c['gender'] not in need: continue   # slot already settled
            s = (fin.get('samples') or {}).get(c['voiceId'])
            m = s and re.match(r'/api/voicelab/clip/([0-9a-f]{16})\.mp3$', s['url'])
            url = m and pub.get(m.group(1))
            if not url:   # same voice, sampled under a sister language's line (e.g. deu_ch for deu_at)
                for oc, of in finals.items():
                    o = (of.get('samples') or {}).get(c['voiceId'])
                    om = o and re.match(r'/api/voicelab/clip/([0-9a-f]{16})\.mp3$', o['url'])
                    if om and pub.get(om.group(1)):
                        url = pub[om.group(1)]; v['otherLine'] = f"reads the {oc} line: «{(of.get('line') or {}).get('text')}»"; break
            if (code, c['voiceId']) in gone: gaps.append({'lang': code, 'voice': v['name'], 'why': 'GONE: Cartesia withdrew it (voice_not_found), cannot be cast'}); continue
            if not url: gaps.append({'lang': code, 'voice': v['name'], 'why': 'no published #716 sample' + (' (lab clip exists but was never published)' if m else '')}); continue
            if c['gender'] not in GENDER: gaps.append({'lang': code, 'voice': v['name'], 'why': 'Cartesia gives no gender, so no slot to put it in'}); continue
            v['audio'] = '/d/' + url.split('/d/')[1]
            voices.append(v)
        langs[code] = {'code': code, 'name': NAMES.get(code, code), 'knownOnly': l['knownOnly'],
                       'knownCourses': l['knownCourses'], 'slots': slots, 'voices': voices,
                       'line': line.get('text'), 'lineSource': line.get('source')}
    for code, L in langs.items():
        for s in L['slots']:
            if not any(v['gender'] == s['gender'] for v in L['voices']):
                gaps.append({'lang': code, 'voice': '-', 'why': f"{GENDER[s['gender']]} slot has NO playable voice at all"})
    dump({'languages': langs, 'gaps': gaps}, os.path.join(a.out, 'voices.json'))
    for code, L in langs.items():
        items = []
        for s in L['slots']:
            for v in [v for v in L['voices'] if v['gender'] == s['gender']]:
                items.append(item1(L, s, v))
        if items:
            items[0]['note'] = f"Every voice reads the same line: «{L['line']}» ({L['lineSource']})" if L['line'] else 'No common audition line recorded.'
            dump({'title': f"Voices round 1 · {lang_label(L)}: like or no", 'conv_id': KAI_ROOM, 'items': items},
                 os.path.join(a.out, 'round1', code + '.json'))
    dump(gaps, os.path.join(a.out, 'gaps.json'))
    print(json.dumps({'languages': len(langs), 'items': sum(len(v['voices']) for v in langs.values()), 'gaps': len(gaps)}))


def lang_label(L): return f"{L['name']} ({L['code']})"


def slot_label(L, g):
    side = 'known-side voice' if L['knownOnly'] else 'target voice (target 1 / 2)'
    return f"{GENDER[g]} {side}"


def describe(v):
    bits = [f"{v['name']} · {GENDER.get(v['gender'], '?')}"]
    if v.get('accent') or v.get('locale'): bits.append(f"{v.get('accent') or ''} {('(' + v['locale'] + ')') if v.get('locale') else ''}".strip())
    if v.get('tagline'): bits.append(v['tagline'])
    out = ' · '.join(bits)
    if v.get('description'): out += ' — ' + v['description']
    if v.get('otherLine'): out += ' [sample ' + v['otherLine'] + ']'
    return out


def vid(v): return v['voiceId'].replace('cartesia_', '')[:8]


def item1(L, s, v):
    extra = ' · also needed as a known/presentation voice' if L['knownCourses'] and not L['knownOnly'] else ''
    return {'id': f"{L['code']}.{s['gender']}.{vid(v)}",
            'source': f"{lang_label(L)} · {slot_label(L, s['gender'])} · now: {s['why']}{extra}",
            'proposed': describe(v), 'options': [LIKE, NO], 'audio': v['audio']}


def read_marks(paths):
    """answers from one or more /api/review-page/state responses, merged, keyed by item id."""
    out = {}
    for p in paths:
        st = load(p)
        out.update(st.get('answers') or {})
    return out


def picked(a, yes):
    """an answer counts as a yes when he tapped the yes option OR Accept; anything else is no/unanswered."""
    if not a: return None
    if a.get('choice') == 'accept': return True
    if a.get('choice') == 'option': return a.get('text') == yes
    if a.get('choice') == 'own': return None   # own words: surfaced, never guessed
    return False


def round2(a):
    man = load(a.manifest)['languages']
    marks = read_marks(a.marks)
    unanswered, own, not_done, settled = [], [], [], []
    for code, L in man.items():
        if code in EXCLUDED: continue   # deu_at: needs ElevenLabs (Kai, 19 Nov 13:38Z), not a Cartesia pick
        items = []
        for s in L['slots']:
            pool = [v for v in L['voices'] if v['gender'] == s['gender']]
            ans = {v['voiceId']: marks.get(f"{code}.{s['gender']}.{vid(v)}") for v in pool}
            for v in pool:
                x = ans[v['voiceId']]
                if x is None: unanswered.append(f"{code}.{s['gender']}.{vid(v)}")
                elif x.get('choice') == 'own': own.append({'id': f"{code}.{s['gender']}.{vid(v)}", 'text': x.get('text')})
            if pool and all(x is None for x in ans.values()):
                not_done.append(f"{code}.{s['gender']}"); continue   # round-1 page not marked yet: no verdict to build on
            liked = [v for v in pool if picked(ans[v['voiceId']], LIKE)]
            none = not liked
            if len(liked) == 1:   # exactly one like = already decided
                settled.append({'slot': f"{code}.{s['gender']}", 'voice': describe(liked[0]), 'voiceId': liked[0]['voiceId']}); continue
            for v in (pool if none else liked):
                items.append({'id': f"r2.{code}.{s['gender']}.{vid(v)}",
                              'source': f"{lang_label(L)} · {slot_label(L, s['gender'])}" + (
                                  " · WE STILL NEED ONE: you liked none of these in round 1, so pick the best of what's available" if none else
                                  f" · you liked {len(liked)} in round 1: pick your favourite"),
                              'proposed': describe(v), 'options': [FAV, NOT], 'audio': v['audio']})
        if items:
            dump({'title': f"Voices round 2 · {lang_label(L)}: favourites", 'conv_id': KAI_ROOM, 'items': items},
                 os.path.join(a.out, 'round2', code + '.json'))
    dump({'settled': settled, 'slots_not_marked_in_round1': not_done, 'unanswered_round1': unanswered, 'own_words_round1': own}, os.path.join(a.out, 'round2-notes.json'))
    print(json.dumps({'slots_not_marked_in_round1': len(not_done), 'unanswered_round1': len(unanswered), 'own_words_round1': len(own)}))


def round3(a):
    man = load(a.manifest)['languages']
    marks = read_marks(a.marks)
    problems = []
    for code, L in man.items():
        # known + presentation voices speak the language as the KNOWN side (eng_for_<lang>), so only a
        # language that is the known side of some course needs this round
        if not L['knownCourses']: continue
        items = []
        for s in L['slots']:
            pool = [v for v in L['voices'] if v['gender'] == s['gender']]
            favs = [v for v in pool if picked(marks.get(f"r2.{code}.{s['gender']}.{vid(v)}"), FAV)]
            if len(favs) != 1: problems.append({'lang': code, 'slot': s['gender'], 'favourites': [v['name'] for v in favs]})
            for v in favs:
                items.append({'id': f"r3.{code}.{s['gender']}.{vid(v)}",
                              'source': f"{lang_label(L)} · your {slot_label(L, s['gender'])}" + (' (one of several favourites: pick one when casting)' if len(favs) > 1 else ''),
                              'proposed': describe(v), 'options': [KNOWN, PRES, NEITHER], 'audio': v['audio']})
        if items:
            dump({'title': f"Voices round 3 · {lang_label(L)}: known and presentation voice", 'conv_id': KAI_ROOM, 'items': items},
                 os.path.join(a.out, 'round3', code + '.json'))
    dump(problems, os.path.join(a.out, 'round3-notes.json'))
    print(json.dumps({'slots_without_exactly_one_favourite': len(problems)}))


def podpool(a):
    man = load(a.manifest)['languages']
    m1, m2 = read_marks(a.marks1), read_marks(a.marks2)
    out = {}
    for code, L in man.items():
        pool, pending = [], []
        for s in L['slots']:
            g = s['gender']
            vs = [v for v in L['voices'] if v['gender'] == g]
            if vs and all(m2.get(f"r2.{code}.{g}.{vid(v)}") is None for v in vs): pending.append(g)
            for v in vs:
                if not picked(m1.get(f"{code}.{g}.{vid(v)}"), LIKE): continue
                if picked(m2.get(f"r2.{code}.{g}.{vid(v)}"), FAV): continue
                pool.append({'voiceId': v['voiceId'], 'name': v['name'], 'gender': g, 'accent': v.get('accent'),
                             'locale': v.get('locale'), 'tagline': v.get('tagline'), 'sample': v['audio']})
        out[code] = {'language': L['name'], 'pool': pool,
                     **({'round2_not_marked': pending} if pending else {})}
    dump({'rule': "voices Kai marked 'like' in round 1 that did not become a target 1/2 favourite in round 2 (Kai, 2026-11-19 12:54Z)",
          'languages': out}, a.out)
    print(json.dumps({c: len(v['pool']) for c, v in out.items()}))


SURFACE = 'http://localhost:4317'


def _req(method, path, body=None):
    import urllib.request
    req = urllib.request.Request(SURFACE + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-cs-conv': os.environ['CS_CONV']})
    return json.load(urllib.request.urlopen(req))


def fetch(a):
    for code, pg in load(a.pages).items():
        dump(_req('GET', '/api/review-page/state?id=' + pg['id']), os.path.join(a.out, code + '.json'))
    print('fetched', len(load(a.pages)))


def post(a):
    pages = {}
    for f in sorted(os.listdir(a.dir)):
        if not f.endswith('.json'): continue
        r = _req('POST', '/api/review-page', load(os.path.join(a.dir, f)))
        pages[f[:-5]] = {'id': r['id'], 'url': r['url'], 'items': r['items']}
        print(f[:-5], r['url'])
    dump(pages, a.pages_out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='cmd', required=True)
    r1 = sub.add_parser('round1'); r1.add_argument('--reg', required=True); r1.add_argument('--e716', required=True); r1.add_argument('--out', required=True)
    for n in ('round2', 'round3'):
        r = sub.add_parser(n); r.add_argument('--manifest', required=True); r.add_argument('--marks', nargs='+', required=True); r.add_argument('--out', required=True)
    pp = sub.add_parser('podpool'); pp.add_argument('--manifest', required=True); pp.add_argument('--marks1', nargs='+', required=True)
    pp.add_argument('--marks2', nargs='+', required=True); pp.add_argument('--out', required=True)
    f = sub.add_parser('fetch'); f.add_argument('--pages', required=True); f.add_argument('--out', required=True)
    p = sub.add_parser('post'); p.add_argument('--dir', required=True); p.add_argument('--pages-out', required=True)
    a = ap.parse_args()
    {'round1': round1, 'round2': round2, 'round3': round3, 'fetch': fetch, 'post': post, 'podpool': podpool}[a.cmd](a)
