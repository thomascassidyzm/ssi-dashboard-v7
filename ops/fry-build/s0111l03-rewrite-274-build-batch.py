# Builds the edit-batch for job #274: rewrite the 4 held S0111L03 rows (see _why in the texts file).
#   python3 ops/fry-build/s0111l03-rewrite-274-build-batch.py s111.json s0111l03-rewrite-274-texts.json > batch.json
# s111.json = GET /api/production/fry_for_eng/script-view?seedStart=S0111&seedEnd=S0111
import json,sys
sv=json.load(open(sys.argv[1])); NEW=json.load(open(sys.argv[2])); NEW.pop('_why')
ops=[]; seen=set()
for sd in sv['seeds']:
  for lg in sd['legos']:
    for p in lg['phrases']:
      k=p['id'].split(':')[-1]
      if k not in NEW: continue
      if 'harsens' not in p['target_text']: sys.exit(f'{k}: live row no longer says harsens: {p["target_text"]!r}')
      if 'ús tinken' not in NEW[k][1] or 'our thinking' not in NEW[k][0]: sys.exit(f'{k}: new row lacks the LEGO')
      seen.add(k)
      ops.append({"op":"phrase.update","phrase_id":p['id'],"expect":{"known_text":p['known_text'],"target_text":p['target_text']},
                  "set":{"known_text":NEW[k][0],"target_text":NEW[k][1]}})
if set(NEW)-seen: sys.exit(f'no live row for {sorted(set(NEW)-seen)}')
print(json.dumps({"ops":ops},ensure_ascii=False,indent=1))
