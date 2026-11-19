#!/usr/bin/env python3
"""cs #976·AI — follow-up to #964·AI's item-12 held-seed fixes, as data. Reads the nightly-copy snapshots (no DB) for the
expect (before) values and writes plan.json: per course the text ops and the clips each new/changed text needs.
Every op carries expect, so a row that drifted since the copy aborts its course's batch (the live pre-check)."""
import json, os
SNAP = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap')
_s = {}
def snap(c):
    if c not in _s: _s[c] = json.load(open(f'{SNAP}/{c}.json'))
    return _s[c]
seed = lambda c, n: next(s for s in snap(c)['seeds'] if s['seed_number'] == n)
phrase = lambda c, pid: next(p for p in snap(c)['phrases'] if p['id'] == f'{c}:{pid}')
lego = lambda c, lid: next(l for l in snap(c)['legos'] if l['lego_id'] == lid)
plan = {}
def add(c, ops=(), clips=(), notes=()):
    p = plan.setdefault(c, {'ops': [], 'clips': [], 'notes': []}); p['ops'] += ops; p['clips'] += clips; p['notes'] += notes
def seed_upd(c, n, **set_):
    s = seed(c, n); return {'op': 'seed.update', 'seed_number': n, 'set': set_, 'expect': {'known_text': s['known_text'], 'target_text': s['target_text']}}
def ph_upd(c, pid, **set_):
    p = phrase(c, pid); return {'op': 'phrase.update', 'phrase_id': f'{c}:{pid}', 'set': set_, 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}}
def lego_upd(c, lid, **set_):
    l = lego(c, lid); return {'op': 'lego.update', 'lego_id': lid, 'set': set_, 'expect': {'known_text': l['known_text'], 'target_text': l['target_text']}}
def link(kind, key, slot, aid):
    o = {'op': 'audio.link', 'target': kind, 'slot': slot, 'audio_id': aid}; o[{'seed': 'seed_number', 'lego': 'lego_id', 'phrase': 'phrase_id'}[kind]] = key; return o
# clip need: kind/key/slot -> text in role (rendered library-first through /api/audio/render)
need = lambda kind, key, role, text: {'kind': kind, 'key': key, 'role': role, 'text': text}

# 1a. spa_mx_for_eng S0450 — Kai's ruling for spa_for_eng/por_br_for_eng (12:25Z, via #964·AI): change the ENGLISH only,
#     drop "themselves"; the target stays. spa_mx has no themselves/mismos LEGO anywhere and its intros don't quote the seed.
c = 'spa_mx_for_eng'
K = KP = 'no they have to catch the train'   # no comma: the seed's own form, so both rows link one existing clip
add(c, ops=[seed_upd(c, 450, known_text=K), ph_upd(c, 'S0450L02U01', known_text=KP)],
    clips=[need('seed', 450, 'known', K), need('phrase', f'{c}:S0450L02U01', 'known', KP)])

# 1b. por_for_eng S0450 — here the course already TEACHES themselves|eles próprios as S0450L02 and its own seed-sentence
#     phrase S0450L03U01 says "não, têm de apanhar o comboio eles próprios"; only the seed row dropped it. Dropping the
#     English instead would leave L02 a LEGO of the seed that the seed never uses, and ten "themselves" phrases. So the
#     seed TARGET takes the phrase's text and its existing clips (no render).
c = 'por_for_eng'
u = phrase(c, 'S0450L03U01')
add(c, ops=[seed_upd(c, 450, target_text=u['target_text']), link('seed', 450, 'target1', u['t1']), link('seed', 450, 'target2', u['t2'])])

# 1c. spa_for_jpn / spa_for_zho S0450 (draft, no LEGOs, no clips) — the known side (自分たちで / 自己) is shared with the
#     six sister draft courses, all of whose targets carry themselves (selbst, eux-mêmes, da soli); the Spanish target is
#     the odd one out. Target becomes ellos mismos, the wording #964 used for spa_for_eng (Spain: coger).
for c in ('spa_for_jpn', 'spa_for_zho'):
    add(c, ops=[seed_upd(c, 450, target_text='No, ellos mismos tienen que coger el tren.')])

# 2. deu_for_jpn S0013L01 — the hart/versuchen rows, fixed as S0007 was: 頑張る is now mein Bestes geben (S0007L04), so
#    とても頑張る|sehr hart is a ZUT clash and "sehr hart versuchen" is not German. sehr cannot grade mein Bestes geben, so
#    the rows move onto the course's surviving hart sense, 一生懸命|hart (S0007L02: hart üben, heute hart üben).
c = 'deu_for_jpn'
b02 = {'op': 'phrase.insert', 'row': {'id': f'{c}:S0013L01B02', 'seed_number': 13, 'lego_index': 1, 'position': 2,
       'known_text': 'とても一生懸命', 'target_text': 'sehr hart', 'phrase_role': 'build', 'introduce': True, 'connected_lego_ids': [],
       'status': 'draft', 'word_count': len('sehr hart'), 'lego_count': 2, 'metadata': {'format': 'build_use', 'pipeline': 'cs976-held-seed-follow-up', 'seed_fix_of': 13}}}
rows = {'S0013L01B03': ('とても一生懸命練習する', 'sehr hart üben'),
        'S0013L01U01': ('とても一生懸命練習するつもりです', 'ich werde sehr hart üben'),
        'S0013L01U04': ('今日とても一生懸命練習したいです', 'ich möchte heute sehr hart üben')}
add(c, ops=[b02] + [ph_upd(c, pid, known_text=k, target_text=t) for pid, (k, t) in rows.items()],
    clips=[need('phrase', f'{c}:S0013L01B02', 'known', 'とても一生懸命'), need('phrase', f'{c}:S0013L01B02', 'target1', 'sehr hart'), need('phrase', f'{c}:S0013L01B02', 'target2', 'sehr hart')]
          + [need('phrase', f'{c}:{pid}', r, k if r == 'known' else t) for pid, (k, t) in rows.items() for r in ('known', 'target1', 'target2')])

# 3. eng_for_tam S0103L04 — Tamil is verb-final: the object comes before the infinitive கேட்க and that before the finite
#    முயற்சிக்கவில்லை, as the corrected seed has it. பல alone needs a noun; standalone "many" is பலவற்றை (accusative).
#    No sandhi doubling (…வற்றை கேட்க), the course's own style ("வார்த்தைகளை கேட்க" in the seed).
c = 'eng_for_tam'
L = 'பலவற்றை கேட்க முயற்சிக்கவில்லை'
tam = {'S0103L04B01': 'நாங்கள் பலவற்றை கேட்க முயற்சிக்கவில்லை',
       'S0103L04B02': 'பல வார்த்தைகளை கேட்க முயற்சிக்கவில்லை',
       'S0103L04B03': 'நான் இப்போது பலவற்றை கேட்க முயற்சிக்கவில்லை'}
add(c, ops=[lego_upd(c, 'S0103L04', known_text=L)] + [ph_upd(c, pid, known_text=k) for pid, k in tam.items()],
    clips=[need('lego', 'S0103L04', 'known', L)] + [need('phrase', f'{c}:{pid}', 'known', k) for pid, k in tam.items()])

# 4. intros (rendered with legoId, which binds them) — course style, "as in" phrase containing the chunk.
plan['_intros'] = [
    {'course': 'deu_for_jpn', 'lego': 'S0007L04', 'text': '頑張る、「頑張るつもりです」のように、をドイツ語で言うと：'},
    {'course': 'deu_for_jpn', 'lego': 'S0007L02', 'text': '一生懸命、「今日一生懸命練習する」のように、をドイツ語で言うと：'},
    {'course': 'eng_for_tam', 'lego': 'S0103L04', 'text': f"ஆங்கிலம்-ல். '{L}'. 'நான் இப்போது {L}' போல். :"},
]
json.dump(plan, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plan.json'), 'w'), ensure_ascii=False, indent=1)
print({c: len(v['ops']) for c, v in plan.items() if c != '_intros'})
