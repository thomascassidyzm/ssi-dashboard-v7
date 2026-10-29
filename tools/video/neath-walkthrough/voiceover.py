#!/usr/bin/env python3
"""
The NPTC "Neath video" with Aran's voiceover (job #572; video filmed by job #542).

The script is services/voice-engine/video-voiceovers.json (slug neath-video): one line per caption step, read on his
English booth (popty.app/r/human_aran_eng, card "Neath video"). This tool re-composes #542's three cuts from its
frames, with the extra "If you get stuck" tips card (#543), and lays each take over the segment it names.

  python3 tools/video/neath-walkthrough/voiceover.py status            which lines have a take
  python3 tools/video/neath-walkthrough/voiceover.py build [--silent]  render full / staff / students cuts

Takes are read through Popty (tools/agent-admin/call.cjs, latest-takes ?q=), never from the database. Each take is
trimmed of edge silence, levelled to -16 LUFS (speech for web video), and starts 0.3 s into its segment. A take longer
than its segment's fitSec may be sped up by at most 5%; past that it is NOT squashed: the segment's last still is held
longer so the whole take plays, and the run reports it. Frames live in FRAMES (default ~/.tmpbig/neath-walkthrough,
#542's working dir; screenshots are never committed). Output: OUT (default ~/.tmpbig/neath-voiceover).
"""
import json, os, re, subprocess, sys, textwrap, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SCRIPT = json.load(open(os.path.join(REPO, 'services/voice-engine/video-voiceovers.json')))
VIDEO = next(v for v in SCRIPT['videos'] if v['slug'] == 'neath-video')
VOICE = VIDEO['voiceIds'][0]
FRAMES = os.path.expanduser(os.environ.get('FRAMES', '~/.tmpbig/neath-walkthrough'))
OUT = os.path.expanduser(os.environ.get('OUT', '~/.tmpbig/neath-voiceover'))
LEAD = 0.3          # silence before each line starts
MAX_SPEEDUP = 1.05  # Aran's brief: no time-stretch beyond 5%
LUFS = -16

# Holds that differ from #542's beats.jsonl, so every segment holds its line's fitSec + 0.5 s.
HOLD_OVERRIDE = {'frames/staff-016.png': 4.0, 'frames/students-004.png': 4.5}
CARD_SEC = {'title': 4.5, 'card-staff': 2.5, 'card-students': 2.5, 'tip': 8.0, 'tip2': 13.0, 'end': 4.0}
CAPTIONS = {
 'staff': {
  '1': ('Step 1', "Open the teacher link from your administrator, then enter your name and staff email."),
  '2': ('Step 2', "You'll be asked to set a password straight away. This step is required, so choose one you'll remember."),
  '3': ('Step 3', "You'll land on My Classes. Tap + New class to create your class."),
  '4': ('Step 4', "Open your class and go to Manage class. In the Invite students box, tap Copy invite link, then post the link on your class Teams page."),
  '4x': ('Good to know', "The Invite students button at the top of the class page is different: it makes a separate link for each named student. For one shared link, use the box under Manage class."),
  '5': ('Step 5', "If a 'Can we reach you here?' box pops up, you can tap Not now."),
  '6': ('Step 6', "To learn together, press Play as class on the class page and share your screen. Students can also work at their own pace with headphones in."),
 },
 'students': {
  '1': ('Step 1', "Open the link your lecturer shared."),
  '2': ('Step 2', "Enter your name and college email. Please do add the email: it's what lets you sign back in on another device."),
  '3': ('Step 3', "That's it: you're in the class and ready to go."),
  '3x': ('Step 3', "That's it: you're in the class and ready to go. Your lecturer sees you on the class list."),
 }}
TITLE = 'SaySomethingin for Neath Port Talbot College'


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


# ── takes ────────────────────────────────────────────────────────────────────
def latest_take(text):
    """His newest take of exactly these words, or None. Searched by the longest run the q= filter keeps intact."""
    runs = [r.strip() for r in re.split(r'[%_,()*\\]', text) if r.strip()]
    q = max(runs, key=len)[:80]
    path = f"/api/recording/voice/{VOICE}/latest-takes?limit=50&q={urllib.parse.quote(q)}"
    out = run(['node', os.path.join(REPO, 'tools/agent-admin/call.cjs'), '--agent', 'aran-watson-572', 'GET', path], cwd=REPO).stdout
    takes = [t for t in json.loads(out).get('takes', []) if (t.get('text') or '').strip() == text.strip() and t.get('role') == 'known']
    return takes[0] if takes else None


def status():
    have = 0
    for line in VIDEO['lines']:
        t = latest_take(line['text'])
        have += bool(t)
        print(f"{'OK ' if t else '-- '} {line['key']:<14} {t['recordedAt'][:19] if t else ''}")
    print(f"{have}/{len(VIDEO['lines'])} recorded")
    return have == len(VIDEO['lines'])


def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout.strip())


def prepare_take(line, take):
    """Download, trim edge silence, level. Returns (wav path, seconds, note)."""
    d = os.path.join(OUT, 'takes'); os.makedirs(d, exist_ok=True)
    raw = os.path.join(d, f"{line['key']}.mp3"); wav = os.path.join(d, f"{line['key']}.wav")
    urllib.request.urlretrieve(take['url'], raw)
    trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,'
            'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    tmp = wav + '.trim.wav'
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', trim, '-ar', '48000', '-ac', '1', tmp])
    sec = duration(tmp)
    fit = line['fitSec']
    note = None
    tempo = 1.0
    if sec > fit:
        if sec <= fit * MAX_SPEEDUP:
            tempo = sec / fit
            note = f"{line['key']}: {sec:.2f} s take sped up {100 * (tempo - 1):.1f}% to fit {fit} s"
        else:
            note = f"{line['key']}: {sec:.2f} s take is longer than its {fit} s slot by more than 5%; not squashed, the still is held {sec - fit:.2f} s longer"
    af = (f'atempo={tempo:.4f},' if tempo != 1.0 else '') + f'loudnorm=I={LUFS}:TP=-1.5:LRA=11'
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', af, '-ar', '48000', '-ac', '1', wav])
    os.remove(tmp)
    return wav, duration(wav), note


# ── pictures (#542's compose.py, plus the tips card) ─────────────────────────
def pictures():
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    F = '/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf'
    font = lambda s, b=False: ImageFont.truetype(F % ('Bold' if b else 'Regular'), s)
    W, H, CAP = 1280, 800, 130
    RED = (200, 49, 43); INK = (38, 34, 31); CANVAS = (232, 227, 221)
    d0 = os.path.join(OUT, 'composed'); os.makedirs(d0, exist_ok=True)

    def card(name, kicker, title, sub=None, body=None):
        im = Image.new('RGB', (W, H + CAP), CANVAS); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, W, 10], fill=RED)
        y = 300 if not body else 230
        d.text((W // 2, y), kicker, font=font(26, True), fill=RED, anchor='mm')
        for i, ln in enumerate(textwrap.wrap(title, 34)):
            d.text((W // 2, y + 70 + i * 66), ln, font=font(56, True), fill=INK, anchor='mm')
        yy = y + 70 + len(textwrap.wrap(title, 34)) * 66 + 20
        if sub:
            d.text((W // 2, yy), sub, font=font(30), fill=(110, 100, 92), anchor='mm'); yy += 60
        for para in (body or []):
            for ln in textwrap.wrap(para, 52):
                d.text((W // 2, yy + 20), ln, font=font(34), fill=INK, anchor='mm'); yy += 48
            yy += 14
        p = os.path.join(d0, f'{name}.png'); im.save(p); return p

    def frame(beat, path, ring):
        shot = Image.open(os.path.join(FRAMES, beat['file'])).convert('RGB')
        for b in beat['blur']:
            box = tuple(int(v) for v in (b['x'] + 4, b['y'] + 4, b['x'] + b['w'] - 4, b['y'] + b['h'] - 4))
            shot.paste(shot.crop(box).filter(ImageFilter.GaussianBlur(9)), box)
        if ring and beat['hl']:
            h = beat['hl']; pad = 7
            ov = Image.new('RGBA', shot.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            r = [h['x'] - pad, h['y'] - pad, h['x'] + h['w'] + pad, h['y'] + h['h'] + pad]
            od.rounded_rectangle([r[0] - 6, r[1] - 6, r[2] + 6, r[3] + 6], 16, outline=(200, 49, 43, 70), width=8)
            od.rounded_rectangle(r, 12, outline=RED + (255,), width=4)
            shot = Image.alpha_composite(shot.convert('RGBA'), ov).convert('RGB')
        im = Image.new('RGB', (W, H + CAP), INK); im.paste(shot, (0, 0)); d = ImageDraw.Draw(im)
        kicker, text = CAPTIONS[beat['part']][beat['step']]
        d.rectangle([0, H, W, H + 4], fill=RED)
        d.rounded_rectangle([28, H + 26, 28 + 170, H + 64], 19, fill=RED)
        d.text((28 + 85, H + 45), kicker, font=font(22, True), fill='white', anchor='mm')
        lines = textwrap.wrap(text, 72)
        y0 = H + 22 + (3 - len(lines)) * 14
        for i, ln in enumerate(lines):
            d.text((222, y0 + i * 34), ln, font=font(26), fill='white')
        im.save(path)

    segs = {}   # segment id -> [(png, seconds), ...]
    order = {'staff': [], 'students': []}
    beats = [json.loads(l) for l in open(os.path.join(FRAMES, 'beats.jsonl'))]
    seen, prev = {}, None
    for i, b in enumerate(beats):
        key = (b['part'], b['step'])
        if key != prev:
            n = seen.get(key, 0); seen[key] = n + 1
            sid = f"{b['part']}:{b['step']}" + ('b' * n)
            order[b['part']].append(sid); segs[sid] = []
            prev = key
        hold = HOLD_OVERRIDE.get(b['file'], b['hold'])
        p0, p1 = os.path.join(d0, f"{b['part']}-{i:03d}a.png"), os.path.join(d0, f"{b['part']}-{i:03d}b.png")
        frame(b, p0, False)
        if b['hl']:
            frame(b, p1, True); segs[sid] += [(p0, 0.7), (p1, hold)]
        else:
            segs[sid] += [(p0, hold)]
    segs['title'] = [(card('title', 'GETTING STARTED', TITLE, 'A two-part walkthrough: Staff, then Students'), CARD_SEC['title'])]
    segs['card-staff'] = [(card('staff-card', 'PART 1', 'Staff', 'Setting up your class'), CARD_SEC['card-staff'])]
    segs['card-students'] = [(card('students-card', 'PART 2', 'Students', 'Joining your class'), CARD_SEC['card-students'])]
    segs['tip'] = [(card('tip', 'TIP', 'If a sign-in code goes missing', body=["Sign-in codes are sent by email, and college email filters sometimes hold them back. If one doesn't arrive, check your junk or quarantine folder."]), CARD_SEC['tip'])]
    segs['tip2'] = [(card('tip2', 'TIPS', 'If you get stuck', body=["Join on the device you'll learn on.", 'Type your college email.', "If you see 'Too many tries', wait a few minutes or switch to mobile data."]), CARD_SEC['tip2'])]
    segs['end'] = [(card('end', 'SAYSOMETHINGIN', "You're ready to go", 'Filmed in the live app, saysomethingin.app'), CARD_SEC['end'])]
    cuts = {
        'staff': ['title', 'card-staff', *order['staff'], 'end'],
        'students': ['title', 'card-students', *order['students'], 'tip', 'tip2', 'end'],
        'full': ['title', 'card-staff', *order['staff'], 'card-students', *order['students'], 'tip', 'tip2', 'end'],
    }
    return segs, cuts


def build(silent=False):
    os.makedirs(OUT, exist_ok=True)
    segs, cuts = pictures()
    by_seg = {l['segment']: l for l in VIDEO['lines']}
    missing_seg = [s for s in by_seg if s not in segs]
    assert not missing_seg, f'script names segments the video does not have: {missing_seg}'
    for sid, line in by_seg.items():
        sec = sum(d for _, d in segs[sid])
        assert sec >= line['fitSec'] + 0.5 - 1e-6, f'{sid} runs {sec:.1f} s, too short for fitSec {line["fitSec"]}'
    takes, notes, missing = {}, [], []
    if not silent:
        for line in VIDEO['lines']:
            t = latest_take(line['text'])
            if not t:
                missing.append(line['key']); continue
            wav, sec, note = prepare_take(line, t)
            takes[line['segment']] = (wav, sec, t['audioId'])
            if note: notes.append(note)
            # Never squash: a take that still overruns its slot holds the segment's last still for longer.
            seg_sec = sum(d for _, d in segs[line['segment']])
            over = LEAD + sec + 0.2 - seg_sec
            if over > 0:
                p, d = segs[line['segment']][-1]
                segs[line['segment']][-1] = (p, d + over)
        if missing:
            print('MISSING takes, nothing rendered:', ', '.join(missing)); return 3
    report = {'notes': notes, 'takes': {s: {'audioId': a, 'sec': round(sec, 2)} for s, (_, sec, a) in takes.items()}, 'cuts': {}}
    for name, order in cuts.items():
        lst = os.path.join(OUT, f'{name}.txt'); t = 0.0; placed = []
        with open(lst, 'w') as f:
            for sid in order:
                if sid in takes: placed.append((takes[sid][0], t + LEAD))
                for p, d in segs[sid]:
                    f.write(f"file '{p}'\nduration {d:.3f}\n"); t += d
            f.write(f"file '{segs[order[-1]][-1][0]}'\n")
        silent_mp4 = os.path.join(OUT, f'{name}-silent.mp4')
        run(['nice', 'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
             '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-threads', '2',
             '-movflags', '+faststart', silent_mp4])
        out = os.path.join(OUT, f'nptc-walkthrough-{name}-voiceover.mp4')
        if placed:
            cmd = ['nice', 'ffmpeg', '-y', '-loglevel', 'error', '-i', silent_mp4]
            for wav, _ in placed: cmd += ['-i', wav]
            chains = [f'[{i + 1}:a]adelay={int(at * 1000)}:all=1[a{i}]' for i, (_, at) in enumerate(placed)]
            mix = ''.join(f'[a{i}]' for i in range(len(placed))) + f'amix=inputs={len(placed)}:normalize=0:duration=longest,apad[aout]'
            cmd += ['-filter_complex', ';'.join(chains + [mix]), '-map', '0:v', '-map', '[aout]', '-shortest',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', out]
            run(cmd)
        else:
            os.replace(silent_mp4, out)
        report['cuts'][name] = {'file': out, 'sec': round(duration(out), 2), 'lines': len(placed)}
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
    print(json.dumps(report, indent=1))
    return 0


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if cmd == 'status': sys.exit(0 if status() else 1)
    if cmd == 'build': sys.exit(build(silent='--silent' in sys.argv))
    print(__doc__); sys.exit(64)
