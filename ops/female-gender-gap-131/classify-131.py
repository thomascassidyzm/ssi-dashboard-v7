#!/usr/bin/env python3
"""cs #131·AI step 2 — was each served target1 clip SPOKEN from the plain (male) text or from its female reading?
Evidence: the TTS spend ledger mirror (~/.local/state/ssi-tts-spend/ledger.jsonl, every paid provider call made on
watson-1 since 2026-09-28, written by services/shared/tts-spend-guard.cjs) records, per call, the course, the voice and
text_hash = sha1(text SENT to the provider)[:16]. The clip's render time is its newest course_audio_revisions entry,
else its created_at (tools/audio/clip-provenance-readonly.cjs). The paid call for that clip's voice whose hash is the
male text or the female reading, nearest that render time (within WINDOW), says which words were spoken:
  wrong   = the male/plain text was sent        right = the female reading was sent
  unknown = rendered before the ledger existed (pre-2026-09-28), or no matching paid call at render time
            (a library link, or a render on another host) — never folded into wrong or right.
  python3 classify-131.py <course> <prefix> <ledger.jsonl> <out.tsv>   (prefix = slots-131.py's out-prefix)"""
import json, sys, hashlib, collections, datetime as dt
course, pre, ledger, out = sys.argv[1:5]
WINDOW = 30 * 60
LEDGER_START = '2026-09-28'
slots = json.load(open(pre + '.slots.json')); prov = json.load(open(pre + '.prov.json'))
clips = {c['id']: c for c in prov['clips']}
revs = collections.defaultdict(list)
for r in prov['revisions']: revs[r['audio_id']].append(r)
h = lambda t: hashlib.sha1((t or '').encode()).hexdigest()[:16]
vnorm = lambda v: (v or '').split('_', 1)[-1] if (v or '').split('_', 1)[0] in ('cartesia', 'azure', 'xai', 'elevenlabs', 'google', 'abair') else (v or '')
ts = lambda s: dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
want = {}
for s in slots:
    c = clips.get(s['clip']) or {}
    for t, side in ((s['text'], 'male'), (c.get('text'), 'male'), (s['female'], 'female')):
        if t: want.setdefault(h(t), set()).add(side)
calls = collections.defaultdict(list)   # hash -> [(at, voice, job)]
with open(ledger) as f:
    for line in f:
        if course not in line or '"kind":"call"' not in line: continue
        e = json.loads(line)
        if e.get('course') == course and e.get('text_hash') in want:
            calls[e['text_hash']].append((ts(e['at']), vnorm(e.get('voice')), e.get('job')))
rows = ['course\tslot\tkind\tseed\tclip\tverdict\twhy\trendered_at\trender_route\tjob\tshared_t2\talso_t1\tplural_we\tmatch\ttext\tfemale\tknown']
for s in slots:
    c = clips.get(s['clip']); 
    if not c: verdict, why, at, route, job = 'unknown', 'clip not in QA copy', '', '', ''
    else:
        rv = sorted(revs.get(c['id'], []), key=lambda r: r['revision'])
        at = rv[-1]['created_at'] if rv else c['created_at']
        route = (rv[-1]['source'] + ' / ' + rv[-1]['accepted_by']) if rv else 'created (no revision)'
        T = ts(at); v = vnorm(c['voice_id'])
        best = None
        for t, side in ((s['text'], 'male'), (c['text'], 'male'), (s['female'], 'female')):
            for a, cv, j in calls.get(h(t), []):
                if cv == v and abs(a - T) <= WINDOW and (best is None or abs(a - T) < best[0]):
                    best = (abs(a - T), side, j, t)
        job = ''
        if best:
            verdict = 'wrong' if best[1] == 'male' else 'right'
            why = f"paid call {int(best[0])}s from render sent the {best[1]} text"; job = best[2] or ''
        elif at < LEDGER_START: verdict, why = 'unknown', 'rendered before the spend ledger (pre-2026-09-28)'
        else: verdict, why = 'unknown', 'no paid call for this voice+text at render time (library link or other host)'
    plural = 'we' if (s['known'] or '').lower().split()[:1] in (['we'], ["we're"], ["we've"], ["we'll"], ["we'd"]) or ' we ' in f" {(s['known'] or '').lower()} " else ''
    rows.append('\t'.join(str(x) for x in [course, s['slot'], s['kind'], s['seed'], s['clip'], verdict, why, at, route, job,
        ','.join(s['clip_t2_users']), ','.join(u for u in s['clip_t1_users'] if u != s['slot']), plural, s['match'],
        s['text'], s['female'], s['known'] or '']))
open(out, 'w').write('\n'.join(rows) + '\n')
cnt = collections.Counter(r.split('\t')[5] for r in rows[1:])
print(course, dict(cnt))
