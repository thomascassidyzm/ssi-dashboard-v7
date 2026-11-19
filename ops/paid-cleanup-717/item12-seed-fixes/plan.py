#!/usr/bin/env python3
"""cs #964·AI — the item-12-held seed fixes, as data. Reads the nightly-copy snapshots (no DB) and writes plan.json:
per course, the text ops (with expect = what the copy held) and the clips each new/changed text needs.
Audio ids are filled in by the runner after /api/audio/render; nothing here touches the DB."""
import json, os
SNAP = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap')
_snap = {}
def snap(c):
    if c not in _snap: _snap[c] = json.load(open(f'{SNAP}/{c}.json'))
    return _snap[c]
def seed(c, n): return next(s for s in snap(c)['seeds'] if s['seed_number'] == n)
def phrase(c, pid): return next(p for p in snap(c)['phrases'] if p['id'] == f'{c}:{pid}')

I12 = lambda n: {"format": "build_use", "pipeline": "cs717-item12-seed-sentence", "seed_sentence_of": n, "canon": "P26", "readded_by": "cs #964·AI"}
NEW = lambda n: {"format": "build_use", "pipeline": "cs964-held-seed-fix", "seed_fix_of": n}

plan = {}
def add(c, **kw): plan.setdefault(c, {"ops": [], "clips": [], "notes": []}); [plan[c][k].extend(v) for k, v in kw.items()]

def seed_upd(c, n, **set_):
    s = seed(c, n)
    exp = {k: s[k] for k in set_}
    return {"op": "seed.update", "seed_number": n, "set": set_, "expect": exp}
def ph_upd(c, pid, **set_):
    p = phrase(c, pid)
    return {"op": "phrase.update", "phrase_id": f'{c}:{pid}', "set": set_, "expect": {k: p[k] for k in set_}}
def ph_del(c, pid):
    p = phrase(c, pid)
    return {"op": "phrase.delete", "phrase_id": f'{c}:{pid}', "expect": {"known_text": p['known_text'], "target_text": p['target_text']}}
def _957(c, pid):   # #957's own planned row for a dropped item 12 id (lego_count / lego_position)
    try:
        for r in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'item12', c, 'plan.json')))['rows']:
            if r['ops'][0]['row']['id'] == f'{c}:{pid}': return r['ops'][0]['row']
    except FileNotFoundError: pass
    return {}
def ph_ins(c, pid, n, li, pos, role, known, target, meta, **extra):
    o = _957(c, pid)
    extra = {"word_count": len(target), "lego_count": o.get('lego_count', len(target.split())), "lego_position": o.get('lego_position'), **extra}
    return {"op": "phrase.insert", "row": {"id": f'{c}:{pid}', "seed_number": n, "lego_index": li, "position": pos, "known_text": known,
            "target_text": target, "phrase_role": role, "introduce": True, "connected_lego_ids": [], "status": "draft", "metadata": meta, **extra}}
def lego_ins(n, li, known, target):
    return {"op": "lego.insert", "row": {"seed_number": n, "lego_index": li, "known_text": known, "target_text": target, "type": "A", "is_new": True}}
# clip needs: (slot owner, slots, text per role)
def need(kind, key, known=None, target=None, reuse=None):
    return {"kind": kind, "key": key, "known": known, "target": target, "reuse": reuse}

# 1. spa_for_eng S0450 — "themselves" untranslated. New LEGO L04 they themselves have to | ellos mismos tienen que (a bare
#    "themselves" LEGO would clash with S0410L02C01 themselves|se; mismos inside "ellos tienen que" needs its own chunk).
c, n = 'spa_for_eng', 450
T = 'no, ellos mismos tienen que coger el tren'
basket = [('B01', 'build', 'they themselves have to', 'ellos mismos tienen que'),
          ('B02', 'build', 'they themselves have to come', 'ellos mismos tienen que venir'),
          ('U01', 'use', 'no they have to catch the train themselves', T),
          ('U02', 'use', 'they have to do it themselves', 'ellos mismos tienen que hacerlo'),
          ('U03', 'use', 'they have to go home themselves', 'ellos mismos tienen que ir a casa')]
add(c, ops=[seed_upd(c, n, target_text=T), lego_ins(n, 4, *basket[0][2:])] +
       [ph_ins(c, f'S0450L04{i}', n, 4, k + 1, r, kn, tg, I12(n) if i == 'U01' else NEW(n)) for k, (i, r, kn, tg) in enumerate(basket)],
    clips=[need('seed', n, target=T)] + [need('phrase', f'S0450L04{i}', known=None if i == 'U01' else kn, target=tg, reuse='seed' if i == 'U01' else None) for i, r, kn, tg in basket]
          + [need('lego', 'S0450L04', reuse='phrase:S0450L04B01')])

# 2. por_br_for_eng S0450 — same defect. New LEGO L05 they themselves have to | eles mesmos têm que.
c = 'por_br_for_eng'
T = 'não, eles mesmos têm que pegar o trem'
basket = [('B01', 'build', 'they themselves have to', 'eles mesmos têm que'),
          ('B02', 'build', 'they themselves have to go', 'eles mesmos têm que ir'),
          ('U01', 'use', 'no they have to catch the train themselves', T),
          ('U02', 'use', 'they have to pay themselves', 'eles mesmos têm que pagar'),
          ('U03', 'use', 'they have to find out themselves', 'eles mesmos têm que descobrir')]
add(c, ops=[seed_upd(c, n, target_text=T), lego_ins(n, 5, *basket[0][2:])] +
       [ph_ins(c, f'S0450L05{i}', n, 5, k + 1, r, kn, tg, I12(n) if i == 'U01' else NEW(n)) for k, (i, r, kn, tg) in enumerate(basket)],
    clips=[need('seed', n, target=T)] + [need('phrase', f'S0450L05{i}', known=None if i == 'U01' else kn, target=tg, reuse='seed' if i == 'U01' else None) for i, r, kn, tg in basket]
          + [need('lego', 'S0450L05', reuse='phrase:S0450L05B01')])

# 3. deu_for_jpn S0007 — "so hart wie möglich versuchen" is not German (versuchen without object, hart ≠ 頑張る).
#    頑張る = sein Bestes geben. New LEGO L04; L02 一生懸命|hart stays (S0106/S0109 hart arbeiten use it); bad rows go.
c, n = 'deu_for_jpn', 7
T = 'Ich möchte heute mein Bestes geben.'
basket = [('B01', 'build', '頑張る', 'mein Bestes geben'),
          ('B02', 'build', '今日頑張る', 'heute mein Bestes geben'),
          ('B03', 'build', '頑張りたい', 'ich möchte mein Bestes geben'),
          ('U01', 'use', '今日できるだけ頑張りたいです。', T),
          ('U02', 'use', '頑張るつもりです', 'ich werde mein Bestes geben'),
          ('U03', 'use', '今頑張りたいです', 'ich möchte jetzt mein Bestes geben')]
add(c, ops=[seed_upd(c, n, target_text=T), lego_ins(n, 4, *basket[0][2:])] +
       [ph_ins(c, f'S0007L04{i}', n, 4, k + 1, r, kn, tg, I12(n) if i == 'U01' else NEW(n)) for k, (i, r, kn, tg) in enumerate(basket)] +
       [ph_del(c, p) for p in ('S0007L02U04', 'S0007L02U05', 'S0007L03B02', 'S0007L03B03', 'S0007L03U01')],
    clips=[need('seed', n, target=T)] + [need('phrase', f'S0007L04{i}', known=None if i == 'U01' else kn, target=tg, reuse='seed' if i == 'U01' else None) for i, r, kn, tg in basket]
          + [need('lego', 'S0007L04', reuse='phrase:S0007L04B01')],
    notes=['S0013 (とても頑張る|sehr hart, ich möchte heute sehr hart versuchen) has the same hart-versuchen defect: not touched, gap.'])

# 4. eng_for_tam S0103 — Tamil known garbled; L04U01 already holds the right Tamil (and its clip).
c, n = 'eng_for_tam', 103
K = phrase(c, 'S0103L04U01')['known_text']
add(c, ops=[seed_upd(c, n, known_text=K)], clips=[need('seed', n, known=K, reuse='phrase:S0103L04U01')],
    notes=['S0103L04 LEGO known "முயற்சிக்கவில்லை கேட்க பல" and B01-B03 keep a garbled order; a decomposition problem, not fixed here (gap).'])

# 5. zho_for_eng S0135 — 觉得那这么好 → 觉得它这么好 (它 = it, S0070L01); B03 你为什么觉得那 (stranded 那) → 你为什么这么觉得.
c, n = 'zho_for_eng', 135
T, R = '我不知道你为什么觉得它这么好', 'wǒ bù zhīdào nǐ wèishénme juéde tā zhème hǎo.'
add(c, ops=[seed_upd(c, n, target_text=T, target_text_roman=R), ph_upd(c, 'S0135L01U01', target_text=T, target_text_roman=R),
            ph_upd(c, 'S0135L01B03', target_text='你为什么这么觉得', target_text_roman='nǐ wèishénme zhème juéde'),
            ph_ins(c, 'S0135L01U07', n, 1, 14, 'use', seed(c, n)['known_text'], T, I12(n), target_text_roman=R)],
    clips=[need('seed', n, target=T), need('phrase', 'S0135L01U01', target=T, reuse='seed'), need('phrase', 'S0135L01B03', target='你为什么这么觉得'),
           need('phrase', 'S0135L01U07', reuse='seed')])

# 6. zho_for_jpn S0233 — known あなたの妹 vs LEGO お姉さん|姐姐 and every phrase: known side is the odd one out.
c, n = 'zho_for_jpn', 233
K = 'あなたのお姉さんを知っている若い女性を知っています。'
add(c, ops=[seed_upd(c, n, known_text=K), ph_ins(c, 'S0233L01U07', n, 1, 10, 'use', K, seed(c, n)['target_text'], I12(n))],
    clips=[need('seed', n, known=K), need('phrase', 'S0233L01U07', reuse='seed')])

# 7. Japanese-known S0020 / S0299 — canonical: "You want to learn his name quickly." / "He wants to pay half."
#    Known side fixed with the courses' own taught frames あなたは〜したい / 彼は〜たいです.
for c in ('eng_for_jpn', 'deu_for_jpn', 'fra_for_jpn', 'ita_for_jpn', 'spa_for_jpn', 'zho_for_jpn'):
    s = seed(c, 20)
    K = 'あなたは' + s['known_text']
    ops = [seed_upd(c, 20, known_text=K)]; clips = [need('seed', 20, known=K)]
    readd = {'eng_for_jpn': ('S0020L03U06', 3, 9), 'fra_for_jpn': ('S0020L03U06', 3, 9), 'ita_for_jpn': ('S0020L03U06', 3, 9), 'spa_for_jpn': ('S0020L03U07', 3, 13)}
    if c in readd:
        pid, li, pos = readd[c]
        ops.append(ph_ins(c, pid, 20, li, pos, 'use', K, s['target_text'], I12(20))); clips.append(need('phrase', pid, reuse='seed'))
    if c == 'deu_for_jpn': clips[0]['reuse'] = 'phrase:S0020L03U01'   # already says あなたは彼の名前を早く覚えたいですね
    if c == 'zho_for_jpn':
        ops.append(ph_upd(c, 'S0020L03U01', known_text=K)); clips.append(need('phrase', 'S0020L03U01', reuse='seed'))
    if c != 'eng_for_jpn':
        s2 = seed(c, 299)
        K2 = '彼は半分払いたいです。'
        ops.append(seed_upd(c, 299, known_text=K2)); clips.append(need('seed', 299, known=K2, reuse='phrase:S0299L01U03' if c == 'zho_for_jpn' else None))
        readd2 = {'deu_for_jpn': ('S0299L02U05', 2, 8), 'fra_for_jpn': ('S0299L02U06', 2, 11), 'ita_for_jpn': ('S0299L02U05', 2, 8), 'spa_for_jpn': ('S0299L02U06', 2, 9)}
        if c in readd2:
            pid, li, pos = readd2[c]
            ops.append(ph_ins(c, pid, 299, li, pos, 'use', K2, s2['target_text'], I12(299))); clips.append(need('phrase', pid, reuse='seed:299'))
    add(c, ops=ops, clips=clips)

json.dump(plan, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plan.json'), 'w'), ensure_ascii=False, indent=1)
print({c: len(v['ops']) for c, v in plan.items()}, sum(len(v['ops']) for v in plan.values()))
