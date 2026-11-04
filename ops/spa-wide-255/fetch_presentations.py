#!/usr/bin/env python3
"""fetch_presentations.py <course.json> <out.json> — reads each is_new LEGO's presentation line from Popty
(GET /api/production/:course/presentation/:legoId) and lists those whose quoted English differs from the LEGO known text."""
import json, sys, urllib.request, re
d = json.load(open(sys.argv[1])); c = d['courseCode']; out = {}; bad = []
for s in d['seeds']:
    for l in s['legos']:
        if not l['is_new']: continue
        r = json.load(urllib.request.urlopen(f"http://localhost:3470/api/production/{c}/presentation/{l['lego_id']}"))
        out[l['lego_id']] = {'text': r.get('text'), 'exists': r.get('exists'), 'hasAudio': r.get('hasAudio'), 'known': l['known_text']}
        m = re.search(r"'(.*)'", r.get('text') or '')
        q = m.group(1) if m else None
        if not r.get('exists') or not r.get('hasAudio') or q is None or q.strip().lower() != l['known_text'].strip().lower():
            bad.append({'lego': l['lego_id'], 'known': l['known_text'], 'presentation': r.get('text'), 'hasAudio': r.get('hasAudio')})
json.dump({'all': out, 'mismatch': bad}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(out), 'presentations', len(bad), 'not mirroring the LEGO or silent')
