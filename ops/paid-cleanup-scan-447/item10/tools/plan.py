#!/usr/bin/env python3
"""item10 plan builder (cs #714·AI). READ-ONLY: reads a Popty script-view dump (../../dump-course.py) and Popty's
GET /api/production/<course>/seed/<S####>/baskets (components), plus a hand-authored decisions file, and writes
plans/<course>.json: per LEGO before -> after, basket ops, back-fill rows, checks, knock-on census, and the exact
edit-batch op list. It never writes to a course: the ops are sent ONLY as a dry run by dryrun.py.

usage: python3 -I plan.py <course> <dump.json> [--no-fetch]
decisions/<course>.json = {"course":..,"legos":[{
   "id":"S0003L03", "verdict":"regloss|grow|recut|keep|kai|misfiled",
   "known":..,"target":..,"type":"A|M","components":[[known,target],..],   # the LEGO after (omit = unchanged)
   "why":..,"closes":["11","19"],"knock":..,
   "basket":{"B01":"keep"|"del"|[known,target]},   # by id suffix; unlisted rows: auto (see below)
   "add":[["b"|"u",known,target],..],               # back-fill, in teaching order
   "extra":[{op..}]                                  # neighbour edits (raw edit-batch ops, carried verbatim)
}]}
Unlisted basket rows: kept if they still contain the new LEGO on both sides; if only the known side lacks the new gloss
and the OLD gloss appears in it as whole words, the old gloss is substituted (listed as "auto" for hand read-back, R0.13);
otherwise the row is UNDECIDED and the plan fails until decided."""
import json, os, re, sys, unicodedata, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
POPTY = 'http://localhost:3470'


def norm(t):
    t = unicodedata.normalize('NFC', t or '').lower()
    t = re.sub(r"[’‘`]", "'", t)
    t = re.sub(r"[\.,!?¿¡;:\"“”«»。，！？、；：（）()\[\]…—–\-]+", " ", t)
    return re.sub(r'\s+', ' ', t).strip()


SPACELESS = re.compile(r'[぀-ヿ㐀-鿿]')  # zh/ja: containment ignores spaces


def has(phrase, lego):
    a, b = norm(lego), norm(phrase)
    if not a:
        return False
    if SPACELESS.search(a):
        return a.replace(' ', '') in b.replace(' ', '')
    return (' ' + a + ' ') in (' ' + b + ' ')


def stem(w):
    w = w.replace("'s", '')
    for suf in ('ing', 'ed', 'es', 's'):
        if len(w) > 4 and w.endswith(suf):
            w = w[:-len(suf)]
            break
    return w.rstrip('e')


def words_in(phrase, lego):
    """known-side containment: every word of the LEGO's known text appears in the phrase (K49: split/reordered is fine;
    K6: an inflection of the word counts — learn/learning, want/wants)"""
    st = [stem(w) for w in norm(phrase).split()]
    pool = collections.Counter(st)
    lw = norm(lego).split()
    if len(lw) > 1 and lw[0] == 'to':  # K54: a verb LEGO's infinitive "to" is not required in the phrase (I feel / he feels)
        lw = lw[1:]
    for w in [stem(x) for x in lw]:
        if pool[w] <= 0:
            return False
        pool[w] -= 1
    return True


def lego_pos(phrase, lego):
    i = phrase.find(lego)
    if i < 0 or not phrase:
        return None
    c = (i + len(lego) / 2) / len(phrase)
    return 'start' if c < 0.33 else 'end' if c > 0.67 else 'middle'


def syl(text, course):
    tgt = course.split('_for_')[0]
    t = norm(text)
    if tgt in ('zho', 'cmn'):
        return len(re.findall(r'[㐀-鿿]', t))
    if tgt == 'kor':
        return len(re.findall(r'[가-힯]', t))
    if tgt == 'jpn':  # morae-ish: kana count + 2 per kanji (estimate; hand-checked where >=7)
        k = len(re.findall(r'[぀-ヿ]', t)) - len(re.findall(r'[ゃゅょャュョっッ]', t))
        return k + 2 * len(re.findall(r'[㐀-鿿]', t))
    if tgt == 'ara':  # vowel marks + long vowels (estimate)
        return max(1, len(re.findall(r'[َُِ]', t)) + len(re.findall(r'[اوي]', t)) // 2) if re.search(r'[؀-ۿ]', t) else _latin(t)
    if re.search(r'[஀-௿ఀ-౿ಀ-೿ঀ-৿਀-੿ऀ-ॿ઀-૿඀-෿]', t):
        return len(re.findall(r'[அ-ஹఅ-హಅ-ಹঅ-হਅ-ਹअ-हઅ-હ](?![்్್্੍्્])', t))
    return _latin(t)


def _latin(t):
    n = 0
    for w in t.split():
        w = re.sub(r"[^a-zàâäéèêëïîôöùûüÿçãõáíóúñ']", '', w)
        g = re.findall(r'[aeiouyàâäéèêëïîôöùûüÿãõáíóú]+', w)
        c = len(g)
        if w.endswith('e') and c > 1 and not w.endswith(('le', 'ee')) and w.isascii():
            c -= 1
        n += max(1, c) if w else 0
    return n


def fetch_components(course, seed, cache_dir, offline):
    f = os.path.join(cache_dir, f'{seed}.json')
    if os.path.exists(f):
        return json.load(open(f))
    if offline:
        return None
    url = f'{POPTY}/api/production/{course}/seed/S{seed:04d}/baskets'
    d = json.load(urllib.request.urlopen(url, timeout=60))
    out = {k: v.get('components') for k, v in (d.get('baskets') or {}).items()}
    os.makedirs(cache_dir, exist_ok=True)
    json.dump(out, open(f, 'w'), ensure_ascii=False)
    return out


def main():
    course, dumpf = sys.argv[1], sys.argv[2]
    offline = '--no-fetch' in sys.argv
    dump = json.load(open(dumpf))
    dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}.json')))
    SD, L, P = {}, {}, {}
    for s in dump['seeds']:
        SD[s['n']] = s
        for l in s['legos']:
            l['seed'] = s['n']
            L[l['id']] = l
            for p in l['phrases']:
                p['lego'] = l['id']
                if p['id'].startswith(course + ':'):
                    P[p['id']] = p
    cache = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), 'components', course)
    after = {i: {'known': l['known'], 'target': l['target'], 'is_new': l['is_new']} for i, l in L.items()}
    plans, ops, problems, autos = [], [], [], []
    seed_known_after = {}
    touched_seeds = set()
    for d in dec['legos']:
        lid = d['id']
        l = L.get(lid)
        rec = {'id': lid, 'verdict': d['verdict'], 'why': d.get('why'), 'closes': ['10'] + d.get('closes', []), 'knock': d.get('knock')}
        if not l:
            problems.append(f'{lid}: not in the live dump'); continue
        s = SD[l['seed']]
        rec['seed'] = {'n': s['n'], 'known': s['known'], 'target': s['target']}
        rec['before'] = {'known': l['known'], 'target': l['target'], 'type': l['type'], 'is_new': l['is_new']}
        if d['verdict'] == 'seed':
            # L25 rung 3 (Kai's call): the seed's KNOWN text is edited so the LEGO is the seed's own words; the LEGO stays.
            nsk = d['seed_known']
            rec['seed_after'] = nsk
            ops.append({'op': 'seed.update', 'seed_number': s['n'], 'set': {'known_text': nsk}, 'expect': {'known_text': s['known'], 'target_text': s['target']}})
            copies = [pid for pid, p in P.items() if norm(p['known']) == norm(s['known']) and norm(p['target']) == norm(s['target'])]
            for pid in copies:
                ops.append({'op': 'phrase.update', 'phrase_id': pid, 'set': {'known_text': nsk}, 'expect': {'known_text': P[pid]['known'], 'target_text': P[pid]['target']}})
            rec['seed_copies_updated'] = copies
            seed_known_after[s['n']] = nsk
            touched_seeds.add(s['n'])
            for e in d.get('extra', []):
                ops.append(e)
            rec['extra'] = d.get('extra', [])
            plans.append(rec); continue
        if d['verdict'] == 'delete':
            # the LEGO's seed part is covered by another LEGO of the same seed; the LEGO and its basket go (structural: tom_go/kai_go on apply)
            ops.append({'op': 'lego.delete', 'lego_id': lid, 'cascade_phrases': True, 'expect': {'known_text': l['known'], 'target_text': l['target']}})
            rec['deleted_rows'] = [p['id'] for p in l['phrases'] if p['id'].startswith(course + ':')]
            after[lid] = {'known': l['known'], 'target': l['target'], 'is_new': False}
            touched_seeds.add(s['n'])
            plans.append(rec); continue
        if d['verdict'] in ('keep', 'kai', 'misfiled'):
            rec['extra'] = d.get('extra', [])
            ops.extend(d.get('extra', []))
            if d.get('extra'):
                touched_seeds.add(s['n'])
            plans.append(rec); continue
        nk, nt = d.get('known', l['known']), d.get('target', l['target'])
        comps = d.get('components')
        rec['after'] = {'known': nk, 'target': nt, 'type': d.get('type', l['type']), 'components': comps, 'is_new': d.get('is_new', l['is_new'])}
        after[lid] = {'known': nk, 'target': nt, 'is_new': rec['after']['is_new']}
        touched_seeds.add(s['n'])
        # --- the LEGO row
        setv = {}
        if nk != l['known']: setv['known_text'] = nk
        if nt != l['target']: setv['target_text'] = nt
        if d.get('type') and d['type'] != l['type']: setv['type'] = d['type']
        if comps is not None: setv['components'] = [{'known': k, 'target': t} for k, t in comps]
        if 'is_new' in d and d['is_new'] != l['is_new']: setv['is_new'] = d['is_new']
        if setv:
            ops.append({'op': 'lego.update', 'lego_id': lid, 'set': setv, 'expect': {'known_text': l['known'], 'target_text': l['target']}})
        # --- checks on the LEGO itself
        chk = {}
        sk_after = d.get('seed_known') or seed_known_after.get(s['n']) or s['known']
        miss = [w for w in norm(nk).split() if stem(w) not in [stem(x) for x in norm(sk_after).split()] and w != 'to']
        chk['known_in_seed'] = not miss or miss
        chk['target_in_seed'] = has(s['target'], nt)
        chk['syllables'] = syl(nt, course)
        if chk['syllables'] > 8: problems.append(f'{lid}: target {nt} estimated {chk["syllables"]} syllables (>8) — hand-check')
        if miss and d['verdict'] != 'regloss-partial': problems.append(f'{lid}: known words not in seed: {miss}')
        if not chk['target_in_seed']: problems.append(f'{lid}: target {nt} not contiguous in seed {s["target"]}')
        rec['checks'] = chk
        # --- basket
        bd = d.get('basket', {})
        bas = []
        maxpos = max([p.get('pos') or 0 for p in l['phrases']] + [0])
        roles = collections.Counter()
        kept = collections.Counter()
        for p in l['phrases']:
            if p['type'] in ('lego_debut',):
                continue
            sid = p['id'][len(course) + 1 + 8:] if p['id'].startswith(course + ':') else p['id']
            roles[p['type']] += 1
            act = bd.get(sid)
            if p['type'] == 'component':
                act = act or 'component'
            if act is None:
                if has(p['target'], nt) and words_in(p['known'], nk):
                    act = 'keep'
                elif has(p['target'], nt) and l['known'] != nk and words_in(p['known'], l['known']):
                    newk = re.sub(r'(?i)\b' + re.escape(l['known']) + r'\b', nk, p['known'], count=1)
                    if newk != p['known'] and words_in(newk, nk):
                        act = [newk, p['target']]
                        autos.append(f'{lid} {sid}: {p["known"]} -> {newk}')
                    else:
                        act = 'UNDECIDED'
                else:
                    act = 'UNDECIDED'
            if act == 'UNDECIDED' and '*' in bd:  # decisions may name a default for rows that no longer carry the LEGO
                act = bd['*']
            if act == 'UNDECIDED':
                problems.append(f'{lid} {sid} UNDECIDED: {p["known"]} | {p["target"]}')
            bas.append({'id': p['id'], 'role': p['type'], 'before': [p['known'], p['target']], 'action': act})
            if isinstance(act, list):
                setp = {}
                if act[0] != p['known']: setp['known_text'] = act[0]
                if act[1] != p['target']: setp['target_text'] = act[1]
                if setp:
                    ops.append({'op': 'phrase.update', 'phrase_id': p['id'], 'set': setp, 'expect': {'known_text': p['known'], 'target_text': p['target']}})
                if not (has(act[1], nt) and words_in(act[0], nk)):
                    problems.append(f'{lid} {sid} rebuilt row does not contain the LEGO: {act}')
                kept[p['type']] += 1
            elif act == 'del':
                ops.append({'op': 'phrase.delete', 'phrase_id': p['id'], 'expect': {'known_text': p['known'], 'target_text': p['target']}})
            elif act == 'keep':
                kept[p['type']] += 1
        # --- back-fill
        nxt = collections.Counter()
        for p in l['phrases']:
            m = re.search(r'([BUC])(\d\d)$', p['id'])
            if m: nxt[m.group(1)] = max(nxt[m.group(1)], int(m.group(2)))
        pos = maxpos
        adds = []
        for role, k, t in d.get('add', []):
            R = 'B' if role == 'b' else 'U'
            nxt[R] += 1; pos += 1
            pid = f'{course}:{lid}{R}{nxt[R]:02d}'
            row = {'id': pid, 'course_code': course, 'seed_number': s['n'], 'lego_index': l['idx'], 'known_text': k, 'target_text': t,
                   'phrase_role': 'build' if R == 'B' else 'use', 'position': pos,
                   'word_count': len(re.findall(r'[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]', t)) if SPACELESS.search(t) or re.search(r'[\uac00-\ud7af]', t) else len(t.split()),
                   'lego_count': len(k.split()),  # course-builder's rule (seed-complete.cjs): known word count
                   'connected_lego_ids': [], 'metadata': {'source': 'item10-backfill'}, 'introduce': True,
                   'lego_position': lego_pos(t, nt)}
            ops.append({'op': 'phrase.insert', 'row': row})
            adds.append(row)
            kept['build' if R == 'B' else 'use'] += 1
            if not (has(t, nt) and words_in(k, nk)):
                problems.append(f'{lid} add {pid} does not contain the LEGO: {k} | {t}')
        rec['basket'] = bas
        rec['_rows_after'] = [(p['role'], p['action'][0] if isinstance(p['action'], list) else p['before'][0],
                               p['action'][1] if isinstance(p['action'], list) else p['before'][1])
                              for p in bas if p['action'] not in ('del',) and p['role'] in ('build', 'use')] + \
                             [(a['phrase_role'], a['known_text'], a['target_text']) for a in adds]
        rec['add'] = adds
        rec['basket_after'] = dict(kept)
        if rec['after']['is_new'] and kept['build'] + kept['use'] < 6:
            problems.append(f'{lid}: thin basket after plan ({dict(kept)})')
        for e in d.get('extra', []):
            ops.append(e)
        rec['extra'] = d.get('extra', [])
        plans.append(rec)
    # --- mirror of the course-builder validator (services/course-builder/routes/v2.cjs runSeedChecks), per changed LEGO,
    #     so a failing ROW is named here (the route only says "vocab violations in N phrase(s)"):
    #     floor (phrase-structure.cjs phraseFloor: build 3+/use 5+ after seed 3; a bare-LEGO row never counts) and
    #     target vocab (validation.cjs checkVocabViolations: CJK = cover the phrase with whole LEGO/component targets
    #     taught up to this seed; others = every word appears in a taught chunk or the seed — looser than the route).
    chinese = course.split('_for_')[0] in ('zho', 'cmn', 'yue', 'hak', 'nan', 'jpn', 'tha', 'mya', 'lao', 'khm')
    cnorm = lambda t: re.sub(r'[¿¡.,;:!?؟،؛«»"“”。，！？、：；\u0589\u064B-\u0652]', '', (t or '').lower()).strip() if chinese else norm(t)
    upd_comps = {r['id']: r['after'].get('components') for r in plans if r.get('after')}
    max_seed = max([r['seed']['n'] for r in plans if r.get('seed')] + [0])
    vocab_upto = {}
    cum = set()
    for sn in sorted(SD):
        if sn > max_seed:
            break
        C = fetch_components(course, sn, cache, offline) or {}
        for l in SD[sn]['legos']:
            cum.add(cnorm(after[l['id']]['target']))
            cs = upd_comps.get(l['id'])
            cs = [{'target': t} for _, t in cs] if cs is not None else (C.get(l['id']) or [])
            for c in cs:
                if c and c.get('target'):
                    cum.add(cnorm(c['target']))
        vocab_upto[sn] = set(cum)

    def uncovered(t, V, seed_t):
        t = cnorm(t)
        if chinese:
            t = t.replace(' ', '')
            n = len(t); dp = [True] + [False] * n
            for i in range(1, n + 1):
                dp[i] = any(len(e) <= i and dp[i - len(e)] and t[i - len(e):i] == e for e in V if e)
            if dp[n]:
                return None
            last = max(i for i in range(n + 1) if dp[i])
            return t[last:]
        W = {w for e in V for w in e.split()} | set(norm(seed_t).split())
        miss = [w for w in t.split() if w not in W]
        return ' '.join(miss) or None

    for r in plans:
        if not r.get('after') or not r['after']['is_new']:
            r.pop('_rows_after', None); continue
        n = r['seed']['n']
        V = {e.replace(' ', '') if chinese else e for e in vocab_upto.get(n, set())}
        rows = r.pop('_rows_after', [])
        lt = cnorm(r['after']['target']).replace(' ', '') if chinese else cnorm(r['after']['target'])
        def bare(t):
            return (cnorm(t).replace(' ', '') if chinese else cnorm(t)) == lt
        nb = sum(1 for ro, k, t in rows if ro == 'build' and not bare(t))
        nu = sum(1 for ro, k, t in rows if ro == 'use' and not bare(t))
        mb, mu = (1, 1) if n <= 3 else (3, 5)
        r['floor'] = {'build': nb, 'use': nu, 'need': [mb, mu]}
        if nb < mb or nu < mu:
            problems.append(f"{r['id']}: below the validator floor after plan (build {nb}/{mb}, use {nu}/{mu})")
        viol = []
        for ro, k, t in rows:
            u = uncovered(t, V, r['seed']['target'])
            if u:
                viol.append({'known': k, 'target': t, 'uncovered': u})
                problems.append(f"{r['id']}: untaught target in row '{k} | {t}' (stuck at '{u}')")
        r['vocab_violations'] = viol
    # --- one op per row: two decisions may both name a row (a neighbour's "extra" repeating a basket rebuild).
    #     An exact repeat is dropped; two DIFFERENT edits of one row are a problem to settle by hand.
    seen_ops, uniq = {}, []
    for o in ops:
        key = (o['op'], o.get('phrase_id') or o.get('lego_id') or o.get('seed_number') or (o.get('row') or {}).get('id'))
        js = json.dumps(o, sort_keys=True, ensure_ascii=False)
        if key in seen_ops:
            if seen_ops[key] != js:
                problems.append(f'two different {key[0]} ops on {key[1]}: settle in decisions')
            continue
        seen_ops[key] = js
        uniq.append(o)
    ops[:] = uniq
    # --- course-wide ZUT at LEGO level (new LEGOs), before vs after
    def zut(view):
        m = collections.defaultdict(set)
        for i, v in view.items():
            if v['is_new']:
                m[norm(v['known'])].add(norm(v['target']).replace(' ', '') if SPACELESS.search(v['target'] or '') else norm(v['target']))
        return {k: sorted(v) for k, v in m.items() if len(v) > 1}
    before = {i: {'known': l['known'], 'target': l['target'], 'is_new': l['is_new']} for i, l in L.items()}
    zb, za = zut(before), zut(after)
    new_clash = {k: v for k, v in za.items() if k not in zb or v != zb[k]}
    changed_glosses = {norm(after[r['id']]['known']) for r in plans if r.get('after')}
    for k, v in new_clash.items():
        if k in changed_glosses:
            problems.append(f'ZUT introduced/changed: "{k}" -> {v}')
    # duplicate LEGOs created: a changed LEGO equal on both sides to an EARLIER new LEGO
    order = sorted(L, key=lambda i: (L[i]['seed'], L[i]['idx']))
    seen = {}
    dups = []
    for i in order:
        v = after[i]
        key = (norm(v['known']), norm(v['target']))
        if key in seen and v['is_new'] and any(r['id'] == i and r.get('after') for r in plans):
            dups.append(f'{i} duplicates {seen[key]} ({v["known"]} | {v["target"]}): set is_new false or re-cut')
        seen.setdefault(key, i)
    # a changed LEGO that now equals a LATER new LEGO on both sides: the later one becomes a duplicate (introduced once, L27 clause 2)
    changed_ids = {r['id'] for r in plans if r.get('after')}
    later_dups = []
    for i in changed_ids:
        v = after[i]
        for j in order:
            if j == i or not after[j]['is_new'] or (L[j]['seed'], L[j]['idx']) <= (L[i]['seed'], L[i]['idx']):
                continue
            if (norm(after[j]['known']), norm(after[j]['target'])) == (norm(v['known']), norm(v['target'])):
                later_dups.append(f'{j} now duplicates {i} ({v["known"]} | {v["target"]})')
    problems.extend(dups)
    # --- O12 knock-on census: rows OUTSIDE the changed baskets that pair the old known gloss with the LEGO's target
    knock = []
    changed = [r for r in plans if r.get('after') and (r['after']['known'] != r['before']['known'] or r['after']['target'] != r['before']['target'])]
    for r in changed:
        ok, ot = r['before']['known'], r['before']['target']
        hits = []
        for pid, p in P.items():
            if p['lego'] == r['id'] or p['type'] == 'component':
                continue
            if has(p['target'], ot) and words_in(p['known'], ok) and len(norm(ok).split()) > 0:
                hits.append({'id': pid, 'known': p['known'], 'target': p['target'], 'seed': int(pid.split(':S')[1][:4])})
        r['knock_census'] = {'rows_pairing_old_gloss': len(hits), 'sample': hits[:12]}
        knock.append((r['id'], len(hits)))
    # --- romanisation (zho/jpn/kor rows carry target_text_roman; the edit door refuses a stale one: ROMAN_STALE)
    roman_flags = []
    bfile = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), f'baskets-{course}.json')
    if os.path.exists(bfile):
        sys.path.insert(0, HERE)
        from roman import roman
        B = json.load(open(bfile))
        rom_now = {}
        for lid2, ph in B.items():
            for q in ph or []:
                rom_now[q['id']] = q.get('target_text_roman')
        lego_rom = {}
        for lid2, ph in B.items():
            lego_rom[lid2] = any((q.get('target_text_roman') or '').strip() for q in ph or [])
        ovr = dec.get('roman', {})
        for o in ops:
            tt, has_rom = None, False
            if o['op'] == 'lego.update' and 'target_text' in o['set']:
                tt, has_rom, tgt = o['set']['target_text'], lego_rom.get(o['lego_id'], False), o['set']
            elif o['op'] == 'phrase.update' and 'target_text' in o['set']:
                tt, has_rom, tgt = o['set']['target_text'], bool((rom_now.get(o['phrase_id']) or '').strip()), o['set']
            elif o['op'] == 'phrase.insert':
                tt, tgt = o['row']['target_text'], o['row']
                has_rom = lego_rom.get(f"S{o['row']['seed_number']:04d}L{o['row']['lego_index']:02d}", False)
            if tt and has_rom:
                r, fl = roman(course, tt, ovr)
                tgt['target_text_roman'] = r
                for f in fl:
                    roman_flags.append(f'{tt} -> {r}: {f}')
    out = {'course': course, 'roman_flags': roman_flags, 'dumped': dump.get('dumped'), 'decisions': len(dec['legos']),
           'verdicts': dict(collections.Counter(r['verdict'] for r in plans)),
           'touched_seeds': sorted(touched_seeds), 'problems': problems, 'auto_substitutions': autos,
           'zut_after_changed': {k: v for k, v in new_clash.items()}, 'later_duplicates': later_dups, 'legos': plans, 'ops': ops}
    os.makedirs(os.path.join(ROOT, 'plans'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, 'plans', f'{course}.json'), 'w'), ensure_ascii=False, indent=1)
    print('  later duplicates:', later_dups)
    print(f'{course}: {len(plans)} LEGOs, verdicts {out["verdicts"]}, {len(ops)} ops, {len(autos)} auto known-subs, {len(problems)} problems')
    for x in problems[:400]:
        print('  !', x)


if __name__ == '__main__':
    main()
