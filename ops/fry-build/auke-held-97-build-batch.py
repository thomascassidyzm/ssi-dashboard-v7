# Builds the edit-batch body for ONE family of Auke's held fry_for_eng fixes (cs job #97, 16 Nov 2026).
# Nothing here applies anything: the body it prints is posted as a DRY RUN (no "apply") to
#   POST /api/production/fry_for_eng/edit-batch
# and Kai's yes on a family is the only thing that turns that same body into an apply ("apply": true).
#
# Every row in a family's texts file names the live text it expects ("old") and the text it becomes ("new",
# or "DELETE"). The builder refuses a row whose live text is not "old" (someone else touched it since this
# was prepared), and every op carries an "expect" so the engine itself also refuses drift at apply time.
#
#   python3 ops/fry-build/auke-held-97-build-batch.py ops/fry-build/auke-held-97-<family>-texts.json \
#           seeds.json sv_*.json > auke-held-97-<family>-batch.json
# seeds.json = GET /api/production/fry_for_eng/seeds ; sv_*.json = GET .../script-view?seedStart=&seedEnd= pages.
#
# Row keys: "SEED<n>" = seed sentence; "LEGO:<lego_id>" = the LEGO (may carry "components"); anything else is
# the phrase id suffix (S0078L01B02, S0057L01C03 ...).
import json, sys

texts = json.load(open(sys.argv[1]))
seeds = {s['seed_number']: s for s in json.load(open(sys.argv[2]))['seeds']}
phr = {}
for f in sys.argv[3:]:
    for sd in json.load(open(f))['seeds']:
        for lg in sd['legos']:
            for p in lg['phrases']:
                if p['type'] != 'lego_debut':
                    phr[p['id'].split(':')[-1]] = p
legos = {l['lego_id']: l for s in seeds.values() for l in s['legos']}

ops, takes = [], []
for r in texts['rows']:
    k, old, new = r['key'], r['old'], r['new']
    if k.startswith('SEED'):
        live = seeds[int(k[4:])]
        cur = [live['known_text'], live['target_text']]
        if new == 'DELETE': sys.exit(f'{k}: seeds are never deleted here')
        op = {"op": "seed.update", "seed_number": live['seed_number']}
        has_take = bool(live.get('target1_audio_id'))
    elif k.startswith('LEGO:'):
        live = legos[k[5:]]
        cur = [live['known_text'], live['target_text']]
        if new == 'DELETE': sys.exit(f'{k}: LEGO deletes are not prepared here')
        op = {"op": "lego.update", "lego_id": live['lego_id']}
        has_take = bool(live.get('target1_audio_id'))
    else:
        live = phr.get(k)
        if not live: sys.exit(f'{k}: no live row')
        cur = [live['known_text'], live['target_text']]
        op = {"op": "phrase.delete" if new == 'DELETE' else "phrase.update", "phrase_id": live['id']}
        has_take = bool(live.get('target1_audio_uuid'))
    if cur != old:
        sys.exit(f'{k}: live is {cur!r}, texts file expects {old!r} — re-read before applying')
    op["expect"] = {"known_text": old[0], "target_text": old[1]}
    if new != 'DELETE':
        if new == old and 'components' not in r: sys.exit(f'{k}: no change')
        op["set"] = {}
        if new[0] != old[0]: op["set"]["known_text"] = new[0]
        if new[1] != old[1]: op["set"]["target_text"] = new[1]
        if 'components' in r: op["set"]["components"] = r['components']
    if has_take and (new == 'DELETE' or new[1] != old[1]):
        takes.append(k)
    ops.append(op)

print(json.dumps({"ops": ops}, ensure_ascii=False, indent=1))
print(f'{texts["family"]}: {len(ops)} ops; Frisian take unlinked or dropped on {len(takes)}: {" ".join(takes)}',
      file=sys.stderr)
