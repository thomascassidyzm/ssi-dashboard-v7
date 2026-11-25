#!/usr/bin/env python3
"""cs #377·AL — part A sister sweep: re-record IN PLACE the ita/spa/fra/por female (target1) clips that the #131 sweep
(25 Nov QA copy + TTS spend ledger) says were spoken from the plain male text, for the rows judged speaker-singular in
sister-plan-377.tsv (decision=rerecord). Same method as #130·AI / #142·AI: POST /api/audio/render with replaceAudioId =
the served clip, text = its stored text, spokenText = the female reading (only where it differs). The route uploads and
verifies the new bytes before swapping (make-before-break), keeps the clip id, bumps the revision, so every slot sharing
the clip is fixed with no relink.

Per clip, all over Popty HTTP (no DB code):
 1. LIVE PRE-CHECK (Kai 19 Nov): edit-batch DRY RUN reading the clip row, every planned slot and each slot's seed.
    HOLD (never forced) if the clip is no longer revision 1 / target1 / tts, a slot no longer serves it, a slot's text
    or its seed's text moved. If the clip's own render word timings ALREADY spell the female reading -> 'already-female',
    nothing rendered (the ledger match was ambiguous).
 2. load gate must say green (GET /health); otherwise wait (bounded) - never write on amber/red.
 3. render (real only with --real). A refusal of any kind stops the run: it is the answer, never retried.
 4. VERIFY: read the clip again - revision moved on, voice unchanged, timings spell the female reading.
Resumable: clips already done for real in the result file are skipped.
  python3 run-377.py <plan.tsv> <seeds-dir> <result.tsv> [--real] [--ceiling CHARS] [--only CLIP]"""
import csv, json, sys, time, re, urllib.request, os
plan, seeds_dir, out = sys.argv[1:4]
real = '--real' in sys.argv
ceiling = int(sys.argv[sys.argv.index('--ceiling') + 1]) if '--ceiling' in sys.argv else 5000
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
H = {'Content-Type': 'application/json', 'x-agent-id': 'kai-377'}

def post(url, body, timeout=300):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=H)
    try:
        return json.load(urllib.request.urlopen(req, timeout=timeout))
    except urllib.error.HTTPError as e:
        try: return json.load(e)
        except Exception: return {'ok': False, 'error': f'HTTP {e.code}'}

def batch(course, ops):
    d = post(f'http://localhost:3470/api/production/{course}/edit-batch', {'ops': ops})
    if d.get('dryRun') is not True or d.get('applied'): raise RuntimeError(f'edit-batch not a clean dry run: {str(d)[:300]}')
    return d['results']

def gate_green(max_wait=1800):
    t = time.time()
    while time.time() - t < max_wait:
        try:
            g = json.load(urllib.request.urlopen('http://localhost:3470/health', timeout=30))['dbLoadGate']
            if g.get('governed') and g.get('level') == 'green': return True
        except Exception: pass
        time.sleep(60)
    return False

norm = lambda s: ' '.join(re.sub(r'[,.?!¿¡;:]', ' ', (s or '').lower()).split())
def slot_op(course, slot, clip):
    if re.fullmatch(r'S\d{4}', slot): return {'op': 'seed.update', 'seed_number': int(slot[1:]), 'set': {'target1_audio_id': clip}}
    if re.fullmatch(r'S\d{4}L\d{2}', slot): return {'op': 'lego.update', 'lego_id': slot, 'set': {'target1_audio_id': clip}}
    return {'op': 'phrase.update', 'phrase_id': f'{course}:{slot}', 'set': {'target1_audio_id': clip}}
def words(a): return ' '.join((a.get('word_timings') or {}).get('words') or [])
def spoken_for(clip_text, female):
    s = female
    if clip_text[:1].isupper(): s = s[:1].upper() + s[1:]
    elif clip_text[:1].islower(): s = s[:1].lower() + s[1:]
    if clip_text[-1:] in '.?!' and s[-1:] not in '.?!': s += clip_text[-1]
    return s

rows = [r for r in csv.DictReader(open(plan), delimiter='\t') if r['decision'] == 'rerecord' and (not only or r['clip'] == only)]
HEAD = 'course\tclip\tmode\toutcome\tclip_text\tspoken\trev_before\trev_after\twords_after\tcharsSpent\tdetail\tat\n'
done, spent = set(), 0
if os.path.exists(out):
    for l in list(csv.DictReader(open(out), delimiter='\t')):
        spent += int(l['charsSpent'] or 0)
        if l['mode'] == 'real' and l['outcome'] in ('rendered', 'library', 'already-female', 'already-rerecorded'): done.add(l['clip'])
else:
    open(out, 'w').write(HEAD)
seeds = {}
def log(*cols):
    open(out, 'a').write('\t'.join(str(c).replace('\t', ' ').replace('\n', ' ') for c in cols) + '\t' + time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()) + '\n')
n = 0
for r in rows:
    c, clip = r['course'], r['clip']
    if clip in done: continue
    if c not in seeds: seeds[c] = {s['seed_number']: s['target_text'] for s in json.load(open(f'{seeds_dir}/{c}.seeds.json'))['seeds']}
    mode = 'real' if real else 'dry'
    slots = r['slots'].split(','); seednums = sorted({int(s[1:5]) for s in slots})
    try:
        res = batch(c, [{'op': 'audio.update', 'audio_id': clip, 'set': {'veracity_reason': 'probe'}}] + [slot_op(c, s, clip) for s in slots]
                    + [{'op': 'seed.update', 'seed_number': k, 'set': {'target_text': seeds[c][k]}} for k in seednums])
    except Exception as e:
        log(c, clip, mode, 'PRECHECK-ERROR', '', '', '', '', '', 0, str(e)[:300]); print('precheck error, stopping:', e); break
    a = res[0]['before']; probs = []
    if a.get('audio_revision') != 1: probs.append(f"revision {a.get('audio_revision')}")
    if a.get('role') != 'target1' or a.get('origin') != 'tts': probs.append(f"{a.get('role')}/{a.get('origin')}")
    for s, x in zip(slots, res[1:1 + len(slots)]):
        b = x.get('before') or {}
        if x.get('changed') is not False: probs.append(f'{s} now serves {b.get("target1_audio_id")}')
        if norm(b.get('target_text')) != norm(r['stored_text']): probs.append(f'{s} text now {b.get("target_text")!r}')
    for k, x in zip(seednums, res[1 + len(slots):]):
        if x.get('changed') is not False: probs.append(f'seed {k} text moved')
    if probs:
        log(c, clip, mode, 'HOLD', a.get('text'), '', a.get('audio_revision'), '', words(a), 0, '; '.join(probs)); continue
    if words(a) and norm(words(a)) == norm(r['female_text']):
        log(c, clip, mode, 'already-female', a.get('text'), '', a.get('audio_revision'), '', words(a), 0, 'render timings already spell the female reading'); continue
    spoken = spoken_for(a['text'], r['female_text'])
    body = {'courseCode': c, 'role': 'target1', 'text': a['text'], 'replaceAudioId': clip, 'job': '#377', 'dryRun': not real,
            'purpose': "female voice said the masculine form; Kai 25 Nov rejects (d/2aa1989e), sister sweep (cs #377)"}
    if norm(spoken) != norm(a['text']): body['spokenText'] = spoken
    if real and not gate_green():
        log(c, clip, mode, 'GATE-NOT-GREEN', a['text'], spoken, 1, '', '', 0, 'load gate not green for 30 min; stopped'); print('gate not green, stopping'); break
    o = post('http://localhost:3470/api/audio/render', body, timeout=600)
    ch = int(o.get('charsSpent') or 0); spent += ch
    if not o.get('ok'):
        log(c, clip, mode, 'REFUSED', a['text'], spoken, 1, '', '', ch, f"{o.get('code','')} {str(o.get('error',''))[:250]}"); print('refused, stopping:', o.get('code'), o.get('error')); break
    if not real:
        log(c, clip, mode, o.get('source'), a['text'], spoken, 1, '', '', 0, f"would spend {o.get('wouldSpendChars')} as {o.get('voiceId')}"); n += 1; continue
    v = batch(c, [{'op': 'audio.update', 'audio_id': clip, 'set': {'veracity_reason': 'probe'}}])[0]['before']
    ok = (v.get('audio_revision') or 0) > 1 and v.get('voice_id') == a.get('voice_id') and (not words(v) or norm(words(v)) == norm(r['female_text']))
    log(c, clip, mode, o.get('source') if ok else 'VERIFY-FAILED', a['text'], spoken, 1, v.get('audio_revision'), words(v), ch,
        f"voice {v.get('voice_id')} s3 {v.get('s3_key')}")
    n += 1
    if not ok: print('verify failed, stopping', clip); break
    if spent > ceiling: print(f'ceiling {ceiling} reached ({spent})'); break
    time.sleep(2)
print(f'{"real" if real else "dry"}: {n} sent, {spent} chars in result file')
