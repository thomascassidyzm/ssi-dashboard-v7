# Builds the edit-batch for job #220 (Auke's 83 grammar corrections of 11 Nov 2026, fry_for_eng).
# APPLIED NOW = only rows that are: phrase kind, never recorded (CSV and live), old text still equal
# to Auke's old_frisian, and no clash with a LEGO or with a word not yet taught. Everything else is held
# for Kai (see the published report). Every new text is listed by hand in auke-83-220-new-texts.json;
# the builder refuses a row whose live text is not Auke's old text, whose new text is not Auke's new
# text, or that now carries a take.
#   python3 ops/fry-build/auke-83-220-build-batch.py all.json new-texts.json auke.csv > batch.json
# all.json = list of GET /api/production/fry_for_eng/script-view?seedStart=&seedEnd= pages.
import json,sys,csv
pages=json.load(open(sys.argv[1])); NEW=json.load(open(sys.argv[2]))
auke={r['id']:r for r in csv.DictReader(open(sys.argv[3],encoding='utf-8-sig'))}
ops=[]; seen=set()
for d in pages:
    for s in d['seeds']:
        for l in s['legos']:
            for p in l['phrases']:
                k=p['id'].split(':')[-1]
                if k not in NEW or p['type'] not in ('build','use'): continue
                a=auke[k]; seen.add(k)
                if a['kind']!='phrase' or a['recorded']!='no': sys.exit(f'{k}: not an unrecorded phrase row in Auke\'s file')
                if p['target_text']!=a['old_frisian']: sys.exit(f'{k}: live text is not Auke\'s old text')
                if NEW[k]!=a['new_frisian']: sys.exit(f'{k}: new text is not Auke\'s new text')
                if p.get('target1_audio_uuid') or p.get('target2_audio_uuid'): sys.exit(f'{k}: has a take now')
                ops.append({"op":"phrase.update","phrase_id":p['id'],
                    "expect":{"known_text":p['known_text'],"target_text":p['target_text']},"set":{"target_text":NEW[k]}})
if set(NEW)-seen: sys.exit(f'no live row for {sorted(set(NEW)-seen)}')
print(json.dumps({"ops":ops},ensure_ascii=False,indent=1))
