# Puts the plan document together: doc-front.md + plan-stageA.md + plan-seeds.md + doc-back.md (with the dry-run section filled in).
import json,collections,os
dry=''
if os.path.exists('dry-run-per-seed.json'):
    d=json.load(open('dry-run-per-seed.json')); bad=[x for x in d if not x.get('ok')]
    ops=json.load(open('ops.json'))['ops']; cnt=collections.Counter(o['op'] for o in ops)
    dry+=f"Sent to `POST :3470/api/production/gle_v2_for_eng/edit-batch` with the header `x-agent-id: cs-107-gle-v2-plan-fable` and never with \"apply\". Popty runs a dry run as a real transaction and rolls it back.\n\n"
    dry+=f"- **The plan as one request** ({len(ops)} operations): no answer. My client gave up after 300 seconds. Popty stayed up. So the plan must be sent in pieces, which is what earlier jobs found too (#241: chunks of 60).\n"
    dry+=f"- **The plan seed by seed** ({len(d)} requests, {sum(x['ops'] for x in d)} operations: "+', '.join(f"{v} {k}" for k,v in cnt.most_common())+f"): **{len(d)-len(bad)} accepted, {len(bad)} refused.**\n"
    if bad:
        dry+="\nRefusals, verbatim:\n\n"
        for b in bad: dry+=f"- Seed {b['seed']} ({b['ops']} operations): `"+json.dumps({k:v for k,v in b.items() if k not in('seed','ops')},ensure_ascii=False)[:700]+"`\n"
    dry+=open('doc-dry-notes.md').read() if os.path.exists('doc-dry-notes.md') else ''
back=open('doc-back.md').read().replace('{DRY}',dry or 'PENDING')
open('plan-document.md','w').write(open('doc-front.md').read()+open('plan-stageA.md').read()+open('plan-seeds.md').read()+back)
print(len(open('plan-document.md').read()),'chars')
