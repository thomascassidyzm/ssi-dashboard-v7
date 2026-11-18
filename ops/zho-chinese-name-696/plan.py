# cs #696·AI — x_for_zho known side says 中文 ("Chinese") where the line means the target language (#481·AI scan, d/b48b1f13).
# Kai approved 18 Nov 2026. Re-reads the course LIVE (GET /api/production/<course>/seeds), replaces 中文 on the KNOWN
# side with the name the course itself already uses (counted below), checks ZUT over the whole course after the edit,
# and writes <course>.ops.json (edit-batch, every op with an `expect`) + <course>.slots.json (audio slots whose words change)
# + <course>.held.json. Usage: python3 plan.py <course> <seeds.json>
import json, re, sys, collections
C, SEEDS_F = sys.argv[1], sys.argv[2]
SEEDS = json.load(open(SEEDS_F))['seeds']
NAME = {'spa_for_zho': '西班牙语', 'fra_for_zho': '法语', 'deu_for_zho': '德语', 'ita_for_zho': '意大利语'}[C]
TWORD = {'spa_for_zho': 'español', 'fra_for_zho': 'français', 'deu_for_zho': 'deutsch', 'ita_for_zho': 'italiano'}[C]
CHINESE_T = ('chino', 'chinois', 'chinesisch', 'cinese')
rows = []
for s in SEEDS:
    rows.append(('seed', s['seed_number'], s))
    for l in s['legos']:
        rows.append(('lego', l['lego_id'], l))
        for p in l.get('basket_phrases', []): rows.append(('phrase', p['id'], p))
# the name must already be the course's own word for its target language
used = sum(NAME in (r[2]['known_text'] or '') for r in rows)
assert used > 30, f'{NAME} used only {used} times in {C}'
held, edits = [], []
for kind, key, r in rows:
    k = r['known_text'] or ''
    if '中文' not in k: continue
    t = (r['target_text'] or '').lower()
    if any(w in t for w in CHINESE_T):
        continue  # the line really means Chinese (e.g. ita seed-160 'in cinese' phrases): correct as it stands
    if TWORD not in t:
        held.append({'kind': kind, 'key': key, 'known': k, 'target': r['target_text'], 'why': f'target does not say {TWORD}: a target-side defect, not this family'})
        continue
    edits.append((kind, key, r, k.replace('中文', NAME)))
# ZUT over the course after the edit. A COMPONENT row is a tile gloss, never a prompt the learner hears, so it neither
# raises nor suffers a clash; a clash is two PROMPTS (seed, LEGO, build/use phrase) with one known and two targets.
norm_k = lambda s: re.sub(r'[\s。？！，、.?!,…“”"「」]', '', s or '')
norm_t = lambda s: re.sub(r'[\s.?!,¿¡;:…"«»“”]', '', (s or '').lower()).replace('’', "'")
after = {key: new for _, key, _, new in edits}
is_comp = lambda r: r.get('phrase_role') == 'component'
m = collections.defaultdict(list)
for kind, key, r in rows:
    if is_comp(r): continue
    m[norm_k(after.get(key, r['known_text']))].append((key, norm_t(r['target_text']), norm_k(r['known_text'])))
pre = []  # clashes that already existed with 中文 (both rows edited, same old prompt): the edit neither makes nor mends them
ops, slots, zut = [], [], []
for kind, key, r, new in edits:
    kk = norm_k(new)
    others = [(k2, t2, o2) for k2, t2, o2 in m[kk] if k2 != key and t2 != norm_t(r['target_text'])]
    if not is_comp(r) and any(o2 == norm_k(r['known_text']) for _, _, o2 in others):
        pre.append({'key': key, 'known_new': new, 'target': r['target_text'], 'clashes_with': [o[:2] for o in others]})
    others = [o for o in others if o[2] != norm_k(r['known_text'])]
    if not is_comp(r) and others:
        zut.append({'kind': kind, 'key': key, 'known_new': new, 'target': r['target_text'], 'clashes_with': others})
        continue
    if kind == 'seed':
        ops.append({'op': 'seed.update', 'seed_number': key, 'set': {'known_text': new}, 'expect': {'known_text': r['known_text']}})
    elif kind == 'lego':
        ops.append({'op': 'lego.update', 'lego_id': key, 'set': {'known_text': new}, 'expect': {'known_text': r['known_text']}})
    else:
        ops.append({'op': 'phrase.update', 'phrase_id': key, 'set': {'known_text': new}, 'expect': {'known_text': r['known_text']}})
    slots.append({'kind': kind, 'key': key, 'role': 'known', 'text': new, 'old_audio': r.get('known_audio_id')})
    if kind == 'lego': slots.append({'kind': 'lego', 'key': key, 'role': 'presentation', 'old_audio': r.get('presentation_audio_id')})
    if r.get('known_gloss_segments') and '中文' in json.dumps(r['known_gloss_segments'], ensure_ascii=False):
        print('NOTE gloss segments carry 中文:', key)
json.dump(ops, open(f'{C}.ops.json', 'w'), ensure_ascii=False, indent=1)
json.dump(slots, open(f'{C}.slots.json', 'w'), ensure_ascii=False, indent=1)
json.dump({'held_target_side': held, 'held_zut': zut, 'preexisting_zut_applied': pre}, open(f'{C}.held.json', 'w'), ensure_ascii=False, indent=1)
print(C, NAME, 'used', used, '| edits', len(ops), dict(collections.Counter(o['op'] for o in ops)), '| held', len(held), '| zut', len(zut), '| pre-existing zut', len(pre))
for z in zut: print('  ZUT', z['key'], z['known_new'], '|', z['target'], z['clashes_with'])
for h in held: print('  HELD', h['key'], h['known'], '|', h['target'])
