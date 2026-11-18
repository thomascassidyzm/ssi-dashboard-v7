#!/usr/bin/env python3
"""Job #71: build Tom's Welsh sample. Each clip is a Welsh sentence, exactly the span the Drill plays, then a short
pause, then its English partner, exactly as the Drill finds it (a span of the card's English take, or the reused
clip of that sentence). Reads <course>.silence-lines.json and whole-turns.json, fetches over the public audio proxy."""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(os.environ['CS_SCRATCH'], 'sample71')
os.makedirs(out, exist_ok=True)
PICKS = [
    ('cym_s_for_eng', 'SC08-S014', 0, 'South, Eleri. Hard case: the old method cut this one mid-sentence'),
    ('cym_s_for_eng', 'SC09-S017', 1, 'South, Eleri'),
    ('cym_s_for_eng', 'SC06-S011', 1, 'South, Dan. Placed by position'),
    ('cym_s_for_eng', 'SC04-S003', 2, 'South, Dan'),
    ('cym_n_for_eng', 'SC01-S004', 2, 'North, Catrin. Hard case: the old method cut this one mid-sentence'),
    ('cym_n_for_eng', 'SC04-S002', 1, 'North, Catrin. Placed by position'),
    ('cym_n_for_eng', 'SC09-S008', 1, 'North, Aran. Placed by position'),
    ('cym_n_for_eng', 'SC22-S008', 2, 'North, Aran. Hard case: three hesitations, and the longest piece'),
]


def fetch(ref):
    f = os.path.join(out, ref + '.mp3')
    if not os.path.exists(f):
        subprocess.run(['curl', '-sL', '--fail', '--max-time', '60', '-o', f, f'https://saysomethingin.app/api/audio/{ref}'], check=True)
    return f


def piece(src, name, a=None, b=None):
    f = os.path.join(out, name + '.wav')
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', src]
    if a is not None:
        cmd += ['-af', f'atrim=start={a / 1000}:end={b / 1000},asetpts=PTS-STARTPTS']
    subprocess.run(cmd + ['-ar', '44100', '-ac', '1', f], check=True)
    return f


clips = []
for n, (course, sid, li, note) in enumerate(PICKS):
    rep = json.load(open(os.path.join(here, f'{course}.silence-lines.json')))
    cards = json.load(open(os.path.join(here, f'{course}.whole-turns.json')))['cards']
    t = next(x for x in rep['turns'] if x['id'].endswith(sid))
    card = next(x for x in cards if x['id'] == t['id'])
    line = t['cut']['lines'][li]
    w = piece(fetch(t['cut']['clip']), f'{n}-w', line['t'][1], line['t'][2])
    if len(line['k']) == 3:
        e = piece(fetch(t['cut']['knownClip']), f'{n}-e', line['k'][1], line['k'][2])
        how = 'English cut from its own take'
    else:
        clip = next(s for s in card['knownSentenceClips'] if s['text'] == line['k'][0])['clips'][0]
        e = piece(fetch(clip['id']), f'{n}-e')
        how = 'English reused'
    gap = os.path.join(out, 'gap.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.7', gap], check=True)
    lst = os.path.join(out, f'{n}.txt')
    open(lst, 'w').write(f"file '{w}'\nfile '{gap}'\nfile '{e}'\n")
    final = os.path.join(out, f'sample-{n + 1}.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', final], check=True)
    clips.append({'label': f"{n + 1}. {line['t'][0]} / {line['k'][0]}. {note}. {how}.", 'file': final})
spec = {
    'title': 'Welsh Pod 1 Drill: sentence cuts sample',
    'intro': 'Each clip is the Welsh sentence as the Drill will play it, a short pause, then its English. Listen for clipped starts and ends, and for English that does not match. These passed measurement only: nobody has listened to them yet.',
    'clips': clips,
}
json.dump(spec, open(os.path.join(out, 'spec.json'), 'w'), ensure_ascii=False, indent=1)
print(os.path.join(out, 'spec.json'))
