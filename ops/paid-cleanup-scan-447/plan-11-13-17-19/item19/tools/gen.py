#!/usr/bin/env python3
"""item 19 decisions generator (cs #807·AI). READ-ONLY, no network. Turns a hand-authored cut list
(item19/decisions/<course>.py) into item19/decisions/<course>.json in tools/plan.py's schema.

Hand-authored per LEGO:  L(id, n, cut, stay=0, take={}, add={}, why='', hold=None, keep=None, acks=())
  n     my own syllable re-count of the LEGO as it stands (target side)
  cut   the pieces, in seed order: (known, target). ' / ' inside BOTH sides marks the component split of a multi-word
        piece (type M); a piece without it is type A.
  stay  index of the piece the EXISTING LEGO shrinks to in place (its rows stay where both sides still contain it)
  take  {piece index: [row suffixes of the old basket]} rows re-homed under an appended NEW piece
        (delete under the old LEGO + insert, same words, under the new one: the clips already exist)
  add   {piece index: [(b|u, known, target), ..]} new rows (piece index == stay -> back-fill under the old LEGO)
  rows  {suffix: 'del' | [known, target]} hand decisions on rows of the old basket
  hold  reason -> verdict 'kai' (nothing changes);   keep -> reason, verdict 'keep' (8 or under / not a defect)
Every other piece is resolved by the tool: already a LEGO of this seed (nothing to add); an exact pair, both sides, of
an EARLIER new LEGO -> appended is_new:false with no basket; otherwise appended NEW and it must carry 3 build + 5 use.
"""
import json, os, re, sys, unicodedata, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
S = os.environ['CS_SCRATCH']


def norm(t):
    t = unicodedata.normalize('NFC', t or '').lower()
    t = re.sub(r"[’‘`]", "'", t)
    t = re.sub(r"[\.,!?¿¡;:\"“”«»。，！？、；：（）()\[\]…—–\-।॥؟،۔]+", " ", t)
    return re.sub(r'\s+', ' ', t).strip()


SP = re.compile(r'[぀-ヿ㐀-鿿]')


def key(k, t):
    f = lambda x: norm(x).replace(' ', '') if SP.search(x or '') else norm(x)
    return (f(k), f(t))


def has(phrase, lego):
    a, b = norm(lego), norm(phrase)
    if SP.search(a):
        return a.replace(' ', '') in b.replace(' ', '')
    return (' ' + a + ' ') in (' ' + b + ' ')


class Course:
    def __init__(self, course):
        self.course = course
        self.dump = json.load(open(f'{S}/dumps/{course}.json'))
        if self.dump.get('source') != 'qa-copy':  # cs #931·AI: plans are made from the nightly copy only
            sys.exit(f'REFUSED: {S}/dumps/{course}.json is not a nightly-copy dump (tools/mkdump.py makes one)')
        self.live = {s['n'] for s in self.dump['seeds']}  # every seed was read from the copy (name kept: 'live' = read)
        self.SD = {s['n']: s for s in self.dump['seeds']}
        self.L = {}
        for s in self.dump['seeds']:
            for l in s['legos']:
                l['seed'] = s['n']
                self.L[l['id']] = l
        self.order = sorted(self.L.values(), key=lambda l: (l['seed'], l['idx']))
        self.out, self.rec, self.problems, self.notes = [], [], [], []
        self.knock = []
        self.vocab_cache = {}
        self.planned_new = {}   # key -> lego id of a NEW piece this plan itself appends (so a later equal piece is not-new)
        self.next_idx = {}

    def earlier(self, k, t, seed, idx):
        kk = key(k, t)
        for l in self.order:
            if (l['seed'], l['idx']) >= (seed, idx):
                break
            if l['is_new'] and key(l['known'], l['target']) == kk:
                return l['id']
        p = self.planned_new.get(kk)
        if p and int(p[1:5]) < seed:
            return p
        return None

    def vocab(self, seed):
        """target words taught by any LEGO at or before this seed (P1, checked on the words as spelt)"""
        if seed not in self.vocab_cache:
            v = set()
            for l in self.order:
                if l['seed'] > seed: break
                t = norm(l['target'])
                v.update(list(t.replace(' ', '')) if SP.search(t) else t.split())
            self.vocab_cache[seed] = v
        return self.vocab_cache[seed]

    def untaught(self, seed, text, extra=''):
        t = norm(text)
        w = list(t.replace(' ', '')) if SP.search(t) else t.split()
        ok = self.vocab(seed) | set(norm(extra).split())
        return [x for x in w if x not in ok]

    def zut(self, k, t, lid):
        """a NEW piece whose known text already answers to a DIFFERENT target in the course"""
        out = []
        for l in self.order:
            if l['id'] != lid and l['is_new'] and norm(l['known']) == norm(k) and key(l['known'], l['target']) != key(k, t):
                out.append(f"{l['id']} {l['known']} | {l['target']}")
        return out

    def piece(self, p):
        k, t = p[0], p[1]
        if ' / ' in t or ' / ' in k:
            ks, ts = [x.strip() for x in k.split(' / ')], [x.strip() for x in t.split(' / ')]
            if len(ks) != len(ts):
                self.problems.append(f'component split uneven: {k} | {t}')
            j = '' if SP.search(k) else ' '
            jt = '' if SP.search(t) else ' '
            return j.join(ks), jt.join(ts), 'M', [[a, b] for a, b in zip(ks, ts)]
        return k, t, 'A', []

    def L_(self, lid, n, cut=None, stay=0, take=None, add=None, rows=None, why='', hold=None, keep=None, closes=(), inherit=None):
        c = self.course
        l = self.L.get(lid)
        if not l:
            self.problems.append(f'{lid}: not in dump'); return
        s = self.SD[l['seed']]
        if l['seed'] not in self.live:
            self.problems.append(f'{lid}: seed not re-read live')
        self.rec.append({'id': lid, 'seed': l['seed'], 'known': l['known'], 'target': l['target'], 'syllables_recount': n,
                         'verdict': 'hold' if hold else 'keep' if keep else 'inherit' if inherit else 'cut',
                         'pieces': None, 'reason': hold or keep or inherit or why})
        head = f'Re-count: {n} syllables. '
        if keep or hold or inherit:
            self.out.append({'id': lid, 'verdict': 'kai' if hold else 'keep', 'why': head + (('HOLD — KAI: ' + hold) if hold else (keep or inherit))})
            return
        take, add, rows = take or {}, add or {}, dict(rows or {})
        P = [self.piece(p) for p in cut]
        for (k, t, ty, comps) in P:
            if not has(s['target'], t):
                self.problems.append(f'{lid}: piece target "{t}" not contiguous in seed "{s["target"]}"')
            if not has(l['target'], t):
                self.notes.append(f'{lid}: piece target "{t}" is outside the old LEGO (grows from the seed)')
        k0, t0, ty0, comps0 = P[stay]
        seed_keys = {key(x['known'], x['target']): x['id'] for x in s['legos'] if x['id'] != lid}
        d = {'id': lid, 'verdict': 'recut', 'known': k0, 'target': t0, 'type': ty0, 'components': comps0, 'basket': rows, 'add': [], 'extra': []}
        e0 = self.earlier(k0, t0, l['seed'], l['idx'])
        pieces_rec = []
        stay_dup_in_seed = seed_keys.get(key(k0, t0))
        if e0 or stay_dup_in_seed:
            d['is_new'] = False
        else:
            z = self.zut(k0, t0, lid)
            if z:
                self.problems.append(f'{lid}: ZUT — "{k0}" already answers to {z}')
        pieces_rec.append({'known': k0, 'target': t0, 'where': lid + ' (in place)', 'is_new': not (e0 or stay_dup_in_seed), 'pair_of': e0 or stay_dup_in_seed})
        allrows = [p for p in l['phrases'] if p['type'] in ('build', 'use')]
        sfx = lambda p: p['id'][len(c) + 1 + 8:]
        taken = {x for v in take.values() for x in v}
        # rows of the old basket: stay only if they still contain the shrunk LEGO; if the LEGO goes not-new, rows not re-homed are deleted (P25)
        for p in allrows:
            sx = sfx(p)
            if sx in taken:
                d['basket'][sx] = 'del'
            elif sx in rows:
                pass
            elif d.get('is_new') is False:
                d['basket'][sx] = 'del'
        for sx, a in list(d['basket'].items()):
            pass
        for role, k, t in add.get(stay, []):
            d['add'].append([role, k, t])
        idx = self.next_idx.get(l['seed'], max(x['idx'] for x in s['legos']))
        for i, (k, t, ty, comps) in enumerate(P):
            if i == stay:
                continue
            kk = key(k, t)
            if kk in seed_keys:
                pieces_rec.append({'known': k, 'target': t, 'where': seed_keys[kk] + ' (already a LEGO of this seed)', 'is_new': None})
                if i in take or i in add:
                    self.problems.append(f'{lid}: piece {i} is already a LEGO of the seed; rows cannot be planned for it here')
                continue
            idx += 1
            nid = f"S{l['seed']:04d}L{idx:02d}"
            e = self.earlier(k, t, l['seed'], l['idx'])
            row = {'seed_number': l['seed'], 'lego_index': idx, 'known_text': k, 'target_text': t, 'type': ty, 'is_new': not e}
            if ty == 'M':
                row['components'] = [{'known': a, 'target': b} for a, b in comps]
            d['extra'].append({'op': 'lego.insert', 'row': row})
            seed_keys[kk] = nid
            pieces_rec.append({'known': k, 'target': t, 'where': nid + ' (appended)', 'is_new': not e, 'pair_of': e})
            if e:
                if i in take or i in add:
                    self.problems.append(f'{lid}: piece {i} "{t}" is a not-new pair of {e}; no basket')
                continue
            self.planned_new[kk] = nid
            z = self.zut(k, t, nid)
            if z:
                self.problems.append(f'{lid}: ZUT — new piece "{k}" already answers to {z}')
            newrows = []
            byid = {sfx(p): p for p in allrows}
            for sx in take.get(i, []):
                p = byid.get(sx)
                if not p:
                    self.problems.append(f'{lid}: take {sx} not in basket'); continue
                newrows.append(('b' if p['type'] == 'build' else 'u', p['known'], p['target'], True))
            for role, kx, tx in add.get(i, []):
                newrows.append((role, kx, tx, False))
            cnt = collections.Counter(r[0] for r in newrows)
            if cnt['b'] < 3 or cnt['u'] < 5:
                self.problems.append(f'{lid}: new piece {nid} "{t}" basket {dict(cnt)} (needs 3 build + 5 use)')
            nb = nu = 0
            for pos, (role, kx, tx, moved) in enumerate(newrows, 1):
                if not moved and any(key(q['known'], q['target']) == key(kx, tx) for x in s['legos'] for q in x['phrases'] if q['type'] in ('build', 'use')):
                    self.notes.append(f'{lid}: new row for {nid} repeats a row already in this seed: {tx}')
                if key(kx, tx) == key(k, t):
                    self.problems.append(f'{lid}: bare-LEGO row for {nid} does not count as a build/use (builder rule): {tx}')
                if not has(tx, t):
                    self.problems.append(f'{lid}: row for {nid} lacks target "{t}": {tx}')
                if not SP.search(k) and not all(w in norm(kx).split() for w in norm(k).split()) and not moved:
                    self.notes.append(f'{lid}: row for {nid} known "{kx}" does not show "{k}" word for word (hand-read)')
                if not moved:
                    u = self.untaught(l['seed'], tx, ' '.join(p[1] for p in P))
                    if u: self.problems.append(f'{lid}: row for {nid} uses untaught {u}: {tx}')
                if role == 'b':
                    nb += 1; pid = f'{c}:{nid}B{nb:02d}'
                else:
                    nu += 1; pid = f'{c}:{nid}U{nu:02d}'
                wc = len(re.findall(r'[぀-ヿ㐀-鿿가-힯]', tx)) if SP.search(tx) or re.search(r'[가-힯]', tx) else len(tx.split())
                d['extra'].append({'op': 'phrase.insert', 'row': {'id': pid, 'course_code': c, 'seed_number': l['seed'], 'lego_index': idx,
                    'known_text': kx, 'target_text': tx, 'phrase_role': 'build' if role == 'b' else 'use', 'position': pos, 'word_count': wc,
                    'lego_position': 'middle', 'lego_count': 1}, **({'rehomed_from': lid} if moved else {})})
        self.next_idx[l['seed']] = idx
        self.rec[-1]['pieces'] = pieces_rec
        desc = '; '.join(f"“{p['target']}” = “{p['known']}” [{p['where']}{'' if p['is_new'] is None else ', NEW' if p['is_new'] else ', not new: taught at ' + str(p.get('pair_of'))}]" for p in pieces_rec)
        d['why'] = head + why + ' Pieces: ' + desc
        d['closes'] = list(closes)
        # P26: the seed sentence still sits in a played basket of this LEGO if it did before
        self.out.append(d)

    def notnew(self, lid, pair_of, why=''):
        """knock-on (L31 / L17): a LATER LEGO that the cut turns into an exact pair of the newly cut piece. It is introduced once
        (at the earlier seed), so this one goes not-new; a not-new LEGO's basket is never played (P25), so its rows go."""
        l = self.L.get(lid)
        if not l:
            self.problems.append(f'{lid}: not in dump'); return
        if l['seed'] not in self.live:
            self.problems.append(f'{lid}: seed not re-read live')
        rows = {p['id'][len(self.course) + 9:]: 'del' for p in l['phrases'] if p['type'] in ('build', 'use')}
        self.knock.append({'id': lid, 'known': l['known'], 'target': l['target'], 'pair_of': pair_of, 'rows_deleted': len(rows)})
        self.out.append({'id': lid, 'verdict': 'recut', 'is_new': False, 'basket': rows,
                         'why': f'Knock-on of the cut at {pair_of}: this LEGO is now word for word the piece taught there ("{l["target"]}" = "{l["known"]}"). '
                                'A pair is introduced once; the later copy becomes not-new, and a not-new LEGO has no played basket, so its '
                                f'{len(rows)} rows are removed (the piece keeps its full basket at {pair_of}). ' + why})

    def done(self):
        json.dump(self.knock, open(os.path.join(ROOT, 'recount', f'{self.course}.knock.json'), 'w'), ensure_ascii=False, indent=1)
        json.dump({'course': self.course, 'legos': self.out}, open(os.path.join(ROOT, 'decisions', f'{self.course}.json'), 'w'), ensure_ascii=False, indent=1)
        json.dump(self.rec, open(os.path.join(ROOT, 'recount', f'{self.course}.json'), 'w'), ensure_ascii=False, indent=1)
        v = collections.Counter(r['verdict'] for r in self.rec)
        print(self.course, dict(v), '| problems', len(self.problems), '| notes', len(self.notes))
        for p in self.problems: print('  PROBLEM', p)
        for p in self.notes: print('  note', p)
