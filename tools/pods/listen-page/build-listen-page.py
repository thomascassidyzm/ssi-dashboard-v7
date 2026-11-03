#!/usr/bin/env python3
"""Build the cym_s_for_eng Pod 1 listen page from Popty's /api/pods snapshot + probed clip durations."""
# Inputs in $CS_SCRATCH: pod.json = GET http://localhost:3470/api/pods/<course>/<slug>; dl.log = "<id> <http> <type> <bytes>" per clip
# fetched from https://watson-1.tail4968cb.ts.net:8443/api/production/audio/<id>/stream; dur.txt = "<id> <ffprobe seconds|ERR>";
# page.html = listen-page.template.html. Usage: python3 build-listen-page.py <out.html>. (job #561, cym_s_for_eng pod-1)
import json, re, sys, os
S = os.environ['CS_SCRATCH']
OUT = sys.argv[1]
pod = json.load(open(f'{S}/pod.json'))
dur = {}
for l in open(f'{S}/dur.txt'):
    a, b = l.split(); dur[a] = None if b == 'ERR' else round(float(b), 3)
dl = {}
for l in open(f'{S}/dl.log'):
    p = l.split(); dl[p[0]] = (p[1], p[2] if len(p) > 2 else '')

clean = lambda s: re.sub(r'\s*\([^)]*\)\s*', ' ', s or '').strip()   # useListeningPods cleanSpeakerName
key = lambda s: clean(s).lower()

rows = sorted(pod['sentences'], key=lambda r: (r['scene_number'], r['global_order']))
# pod-wide speaker colour order, first appearance (palette index only; app also avoids scene-mate clashes)
order = []
for r in rows:
    k = key(r['speaker'])
    if k not in order: order.append(k)
lines, scenes = [], {}
prev_scene, prev_key = None, None
for r in rows:
    sc = r['scene_number']
    if sc != prev_scene:
        m = re.search(r'\(([^)]+)\)', r['speaker'] or '')
        scenes[sc] = f'Scene {sc}' + (f' · {m.group(1)}' if m else '')
        prev_key = None              # openScene resets prevSpeakerKey per scene
    k = key(r['speaker'])
    problems = []
    for side, aid in (('Welsh', r['target_audio_id']), ('English', r['known_audio_id'])):
        if not aid: problems.append(f'{side}: no clip linked')
        elif dl.get(aid, ('?',))[0] != '200': problems.append(f'{side}: clip did not load ({dl.get(aid)})')
        elif dur.get(aid) is None: problems.append(f'{side}: clip does not decode')
    lines.append(dict(n=len(lines) + 1, sc=sc, sp=clean(r['speaker']), c=order.index(k) % 6,
                      cy=r['target_text'], en=r['known_text'], t=r['target_audio_id'], k=r['known_audio_id'],
                      td=dur.get(r['target_audio_id']), kd=dur.get(r['known_audio_id']),
                      ts=(prev_key is None or k != prev_key), j=bool(r.get('jumpIn')), bad=problems))
    prev_scene, prev_key = sc, k

# Running time exactly as the app schedules it (ListeningOverlay + podModalQueue + podChangeover), clip time + app gaps
def total(mode):
    ms = 0
    for i, L in enumerate(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) and lines[i + 1]['sc'] == L['sc'] else None
        if mode == 'drill':
            ms += (3 * (L['td'] or 0) + (L['kd'] or 0)) * 1000 + 3 * 90
            ms += 90
        else:
            ms += (L['td'] or 0) * 1000
            ms += 0 if (nxt and nxt['j']) else (50 if (nxt and not nxt['ts']) else 90)
    return ms / 1000
tot = {'immersion': total('immersion'), 'drill': total('drill')}
data = dict(title=pod['pod']['title'], visibility=pod['pod']['visibility'], scenes=scenes, lines=lines, totals=tot,
            snapshot='2026-11-03', bad=sum(1 for L in lines if L['bad']))
tpl = open(f'{S}/page.html').read()
open(OUT, 'w').write(tpl.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False, separators=(',', ':'))))
fmt = lambda s: f'{int(s // 60)} min {int(round(s % 60))} s'
print('lines', len(lines), 'flagged', data['bad'], 'immersion', fmt(tot['immersion']), 'drill', fmt(tot['drill']))
