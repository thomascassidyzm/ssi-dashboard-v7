# cs job #411·AI (17 Nov 2026): write the English intro (presentation) text for every new fry_for_eng LEGO, and count the
# English known slots that have no clip. TEXT ONLY: nothing is written to the course and nothing is rendered.
# Reads live rows from Popty (GET /api/production/fry_for_eng/seeds); no database access.
#
#   python3 ops/fry-build/intros-411-write.py <seeds.json | -> <out-dir>
#
# The frame is the estate English template, the shape intro-splice.cjs can assemble from existing Charlotte pieces:
#   Frame B  The Frisian for: '<known>', as in — '<context>', is:
#   Frame A  The Frisian for: '<known>', is:
# <known> is introChunk(known_text) (first option of a slash compound), quoted byte for byte (canon O13).
# <context> is the parent seed's known sentence, without its closing punctuation, when it contains the chunk as whole words
# and is longer than it; else Frame A (presentation-author.cjs fallbackFrame, made whole-word as intro-mirror.cjs does).
# HEADS-UP lines (canon PR1/PR3, L33): the LEGOs in HEADS_UP take a Frisian "it" the English does not say (Auke's
# it-after-witte rule; Kai's stand-in "it" frames, #409·AI). Their context is a short English line that SHOWS the "it" —
# still the as-in shape, so it splices and mirrors. A context that would not contain the chunk whole is not used (listed).
import json, re, sys, os

LANG = 'Frisian'  # voicing-policy introFragmentText for fry — the dry run reports "The Frisian for" as reused
HEADS_UP = {
    'S0008L04': "I'm going to try it", 'S0049L02': 'if you know it', 'S0050L01': "I'm not trying it",
    'S0057L01': "I can't remember it", 'S0059L01': 'I know it', 'S0074L02': 'to understand it',
    'S0078L01': "I don't understand it", 'S0103L01': "we're not trying it", 'S0135L01': "I don't know it",
    'S0146L02': 'since we tried it', 'S0152L02': 'if I had known it', 'S0174L01': 'can you understand it',
    'S0213L01': "we don't know it", 'S0251L01': 'I only want to know it', 'S0346L01': 'I wanted her to know it',
    'S0421L01': 'because they already know it', 'S0425L04': 'that they understand it',
    'S0521L02': "that you'll forget it", 'S0579L01': "we've often tried it", 'S0607L01': "if I'd known it",
    # the "it" falls inside the chunk here, so no as-in line can both show it and quote the chunk whole (O13): listed for Kai
    'S0060L01': "I don't know it yet", 'S0113L01': "why don't I know it any more", 'S0606L01': "if I'd known it then",
}


def fold(s): return re.sub(r'\s+', ' ', re.sub(r"[’‘`´]", "'", s or '')).strip().lower()


def contains_words(text, chunk):
    t, c = fold(text), fold(chunk)
    return bool(c) and re.search(r'(^|[^\w])' + re.escape(c) + r'(?=[^\w]|$)', t) is not None


def intro_chunk(k): return k.split(' / ')[0].strip() if ' / ' in k else k.strip()


def context_of(seed_known): return re.sub(r'[.!?]+$', '', seed_known.strip())


def main():
    src, out = sys.argv[1], sys.argv[2]
    d = json.load(sys.stdin if src == '-' else open(src))
    rows, known = [], []
    for s in sorted(d['seeds'], key=lambda s: s['seed_number']):
        known.append(('seed', f"S{s['seed_number']:04d}", s['known_text'], s['known_audio_id']))
        ctx = context_of(s['known_text'])
        for l in s['legos']:
            known.append(('lego', l['lego_id'], l['known_text'], l['known_audio_id']))
            for p in l['basket_phrases']:
                known.append((p['phrase_role'], p['id'].split(':')[-1], p['known_text'], p.get('known_audio_id')))
            if not l['is_new']: continue
            chunk = intro_chunk(l['known_text'])
            kind, c, note = 'standard', None, None
            hu = HEADS_UP.get(l['lego_id'])
            if hu and contains_words(hu, chunk): kind, c = 'heads-up', hu
            else:
                if hu: note = f"heads-up '{hu}' would not quote the chunk whole (O13) — standard line kept, Kai to say"
                if contains_words(ctx, chunk) and fold(ctx) != fold(chunk): c = ctx
            text = f"The {LANG} for: '{chunk}', as in — '{c}', is:" if c else f"The {LANG} for: '{chunk}', is:"
            rows.append(dict(lego_id=l['lego_id'], seed=s['seed_number'], known=l['known_text'], target=l['target_text'],
                             frame='B' if c else 'A', kind=kind, text=text, has_clip=bool(l['presentation_audio_id']),
                             note=note))
    os.makedirs(out, exist_ok=True)
    json.dump(rows, open(os.path.join(out, 'intros-411.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump([dict(kind=k, key=i, text=t, audio=a) for k, i, t, a in known], open(os.path.join(out, 'known-slots-411.json'), 'w'), ensure_ascii=False)
    print(len(rows), 'intros;', sum(r['frame'] == 'B' for r in rows), 'frame B;', sum(r['kind'] == 'heads-up' for r in rows), 'heads-up;', len(known), 'known slots')


if __name__ == '__main__':
    main()
