#!/usr/bin/env python3
"""Talk Bollocks Part 1 Italian (job #323).

  python3 build.py apply            corrections -> manifest-checked.json (texts only) + changelog.md
  python3 build.py render [--real]  changed clips through tools/audio/render.cjs --trial (dry run unless --real)
  python3 build.py spec OUTDIR      clip-page spec (one joined MP3 per turn) from manifest-checked.json

Renders go only through Popty's one audio door (render.cjs); this file never touches a provider.
"""
import json, os, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
ORIG = HERE / '983-original' / 'manifest.json'
CHECKED = HERE / 'manifest-checked.json'
RESULTS = HERE / 'render-results.json'
CAP = 300


def apply():
    m = json.loads(ORIG.read_text())
    corr = json.loads((HERE / 'corrections.json').read_text())
    old = {i: e['text'] for i, e in enumerate(m)}
    reasons = {}
    for c in corr:
        e = m[c['i']]
        assert e['text'].count(c['from']) == 1, (c['i'], c['from'])
        e['text'] = e['text'].replace(c['from'], c['to'])
        reasons.setdefault(c['i'], []).append(c['why'])
    changed = sorted(reasons)
    for i in changed:
        assert len(m[i]['text']) <= CAP, (i, len(m[i]['text']))
        m[i]['changed'] = True
    # keep prior render results if any
    if RESULTS.exists():
        res = json.loads(RESULTS.read_text())
        for k, r in res.items():
            if r.get('audioId') and r.get('text') == m[int(k)]['text']:
                m[int(k)].update(audioId=r['audioId'], s3Key=r.get('s3Key'), rerendered=True)
    CHECKED.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n')
    lines = ['# Talk Bollocks Part 1 (Italian) — Opus check, change log', '',
             f'{len(changed)} of {len(m)} clips changed across {len({m[i]["turn"] for i in changed})} of {m[-1]["turn"]} turns; '
             f'{sum(len(m[i]["text"]) for i in changed)} characters to re-voice. Every other clip was read and left alone.', '',
             'Kept on purpose: "bordi" for Aran\'s "edges" (used consistently as the method\'s term), the pys/pesce adaptation of Tom\'s "puss", '
             'English example phrases (red bus, to boldly go, listless) left in English.', '']
    for i in changed:
        e = m[i]
        lines += [f'**Turn {e["turn"]} · {e["spk"]}** — {"; ".join(reasons[i])}', '',
                  f'- was: {old[i]}', f'- now: {e["text"]}', '']
    (HERE / 'changelog.md').write_text('\n'.join(lines))
    print(len(changed), 'clips,', sum(len(m[i]['text']) for i in changed), 'chars')


def render(real):
    m = json.loads(CHECKED.read_text())
    res = json.loads(RESULTS.read_text()) if RESULTS.exists() else {}
    total = 0
    for i, e in enumerate(m):
        if not e.get('changed'):
            continue
        if real and res.get(str(i), {}).get('text') == e['text'] and res[str(i)].get('audioId'):
            continue  # already rendered this exact text
        cmd = ['node', str(REPO / 'tools/audio/render.cjs'), '--trial', '--course', 'ita_for_eng', '--role', 'target1',
               '--lang', 'ita', '--voice', e['voiceId'], '--text', e['text'], '--job', '#323',
               '--started-by', 'Tom', '--purpose', f'#323 Talk Bollocks P1 Italian fix, turn {e["turn"]} ({e["spk"]})']
        if not real:
            cmd.append('--dry-run')
        p = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, 'AGENT_ID': 'job-323'})
        out = p.stdout.strip()
        try:
            ans = json.loads(out[out.index('{'):])
        except ValueError:
            ans = {'raw': out, 'err': p.stderr.strip()}
        total += len(e['text'])
        print(i, p.returncode, json.dumps(ans, ensure_ascii=False)[:300], flush=True)
        if real:
            res[str(i)] = {'text': e['text'], 'audioId': ans.get('audioId'), 's3Key': ans.get('s3Key'),
                           'source': ans.get('source'), 'charsSpent': ans.get('charsSpent'), 'exit': p.returncode}
            RESULTS.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
            if p.returncode != 0:
                print('REFUSED/FAILED — stopping, no retry'); break
    print('chars', total)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'apply':
        apply()
    elif cmd == 'render':
        render('--real' in sys.argv)
