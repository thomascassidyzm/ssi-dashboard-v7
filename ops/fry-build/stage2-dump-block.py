# Prints a block of fry_for_eng seeds (every LEGO + phrase) from a script-view JSON read via Popty:
#   curl -s "localhost:3470/api/production/fry_for_eng/script-view?seedStart=A&seedEnd=B" > b.json
#   python3 ops/fry-build/stage2-dump-block.py b.json
import json,sys
d=json.load(open(sys.argv[1]))
for s in d['seeds']:
    print(f"\n=== {s['seed_number']} [{s['status']}] | {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        print(f"  [{l['lego_id']} {l['type']} new={l['is_new']}] {l['known_text']} | {l['target_text']}")
        for p in l['phrases']:
            print(f"    {p['type'][0].upper()} {p['id'].split(':')[1]}: {p['known_text']} | {p['target_text']}")
