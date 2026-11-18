#!/usr/bin/env python3
"""cs #241·AI: the re-record plan for the fra_for_eng female (target1) clips #175·AI heard saying the male form.
Scope (Kai, 16 Nov 17:37Z): whisper-fra-175.tsv rows verdict MALE + UNCLEAR + FEMALE rows whose note flags a masc liaison.
For each clip: its LIVE slots (from a GET /api/production/fra_for_eng/seeds snapshot), the slot text (the clip's label,
which stays as it is: the male form is the row's canonical text and the target2 male voice shares it), and the female text
to SEND as spokenText = the course's own gender expansion for that slot text (slots-131 'female', exact expanded_f).
GENDER CHECK (Kai: "check that the text that is sent is the female form"): for every word pair m/f on the row, the text
sent must contain the female word and contain fewer male words than the label does; otherwise the row is BLOCKED.
  python3 plan-241.py <seeds.json>  -> plan-241.tsv"""
import csv, json, re, sys, os
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(D, '..')
lines = open(os.path.join(R, 'female-gender-gap-131/whisper-fra-175.tsv')).read().split('\n')[1:]
rows = [r for r in csv.DictReader(lines, delimiter='\t') if r['verdict'] in ('MALE', 'UNCLEAR') or (r['verdict'] == 'FEMALE' and 'liaison' in r['note'])]
done = set()
for f in ('female-gender-gap-142/result-142-fra_for_eng.tsv',):
    for r in csv.DictReader(open(os.path.join(R, f)), delimiter='\t'):
        if r['mode'] == 'real' and r['source'] in ('rendered', 'library', 'already-rerecorded'): done.add(r['clip'])
for r in csv.DictReader(open(os.path.join(R, 'female-gender-gap-142/result-155.tsv')), delimiter='\t'): done.add(r['clip_after']); done.add(r['clip_before'])
exp = {}
for r in csv.DictReader(open(os.path.join(R, 'female-gender-gap-131/slots-131-fra_for_eng.tsv')), delimiter='\t'): exp[r['text']] = r['female']
seeds = json.load(open(sys.argv[1]))['seeds']
t1, t2 = {}, {}
for s in seeds:
    items = [(s['seed_id'], s)]
    for l in s.get('legos') or []:
        items.append((l['lego_id'], l))
        items += [(p['id'].split(':', 1)[-1], p) for p in l.get('basket_phrases') or []]
    for sid, it in items:
        if it.get('target1_audio_id'): t1.setdefault(it['target1_audio_id'], []).append((sid, it.get('target_text') or '', it.get('known_text') or '', s['target_text']))
        if it.get('target2_audio_id'): t2.setdefault(it['target2_audio_id'], []).append(sid)

# KAI'S RULE (16 Nov, as #142·AI applied it): male is the default; the female form ONLY where the word refers to the female
# speaker ("I", or "we" -- the brief asks for feminine "nous ... silencieuses") or to a woman. Every row below was read
# against the seed(s) its slots belong to; the course's own gender expansion offers a female reading that is WRONG there,
# so the clip already says the right (male) form and is HELD, not rendered. Keyed by clip-id prefix.
YOU = "refers to 'you' (no female referent): male default"
HE = 'refers to a man (seed about he / my son)'
THEY = 'refers to "they" (masculine plural ils): male default'
IT = 'refers to a thing / masculine noun / impersonal: male default'
GEN = 'generic (no one in particular): male default'
HOLD = {
 'c06bcc7d': YOU + ' (seed 95 es-tu prêt)', '95c18347': YOU, '77af6b63': YOU, 'f8170ef7': YOU + ' (seed: tu es prêt à payer)',
 'df9b363d': YOU + ' (seed: tu étais très courageux)', 'c740f891': YOU + ' (seed: tu étais très courageux)',
 '7208e029': HE + ' (seed: il n\'était pas très patient)', '62f72b23': HE + " (seed: qu'il est content)", 'e9827bcc': HE + ' (mon fils ... enseignant)',
 '264ab553': HE + ' (il est debout tout seul)', '453fc9c6': HE + ' (il est debout tout seul)',
 'b3b78710': HE + ' (one clip serves seed 345 "il n\'est pas encore prêt" and an unrelated seed 60 fragment)',
 'c0f64a00': HE + ' (one clip serves seed 361 "il était silencieux" as well as 403 we / 549 I: male default for the shared clip)',
 '1d09dc9f': HE + ' (one clip serves seed 361 "il était silencieux" as well as 403 we / 549 I: male default for the shared clip)',
 '66d2f5ad': THEY, '2d0c562f': THEY, '577d3705': THEY, '10dff0c1': THEY, '6bd6290f': THEY, '28178b73': THEY, '2ff0e544': THEY,
 '791e7410': IT + " (c'est amusant)", 'fc002efa': IT + " (c'est moins passionnant)", '0b7aaf23': IT + " (c'était beau)",
 '4051e5bd': IT + ' (le bon exemple)', '4f084d09': IT + ' (ce serait parfait)', '5b99f1f4': IT + ' (ce serait parfait)',
 '94931e88': IT + ' (un grand monde)', '324b0b51': IT + ' (un grand monde)', '1b745b78': IT + ' (un cœur si gentil)', '1d0135aa': IT + ' (un cœur si gentil)',
 'a62dc3db': IT + ' (café fort)', '83b22f66': IT + ' (café fort)', '1f244264': IT + ' (café fort)', 'cc27a175': IT + ' (café fort)',
 '2f8fc12a': IT + ' (endroits ... intéressant)', '5d792458': IT + ' (endroits ... intéressant)', 'f79dc181': IT + " (ça a été très bouleversant d'attendre)",
 '366e726d': IT + ' (quelque part de plus chaud; the brief named this UNCLEAR row in scope, held on the seed)',
 'f4780332': GEN + " (être fou c'était mal)", '302bde00': GEN + " (plus important ... que d'être parfait)",
}
tok = lambda t: re.findall(r"[\w’'-]+", t.lower().replace('’', "'"))
def count(words, w): return sum(1 for x in words if x == w or x.split("'")[-1] == w)
def gender_check(label, send, pairs):
    a, b = tok(label), tok(send); bad = []
    for p in pairs.split(','):
        m, f = [x.strip().lower() for x in p.split('/')]
        if count(b, f) < 1: bad.append(f'no {f}')
        if count(b, m) >= max(1, count(a, m)): bad.append(f'still {m}')
    return bad
out = open(os.path.join(D, 'plan-241.tsv'), 'w')
out.write('clip\tverdict175\tword_pair\tlive_t1_slots\tt2_shares\tlabel\tsend\tsend_source\tfemale_175\tchars\tgender_check\tstatus\tknown\tseed_text\n')
for r in rows:
    c = r['clip']; live = t1.get(c, [])
    texts = sorted({x[1] for x in live}); label = texts[0] if texts else ''
    send = exp.get(label) or ''; src = 'expansion' if send else 'whisper-175 female_text'
    if not send: send = r['female_text']
    flags = []
    if c in done: flags.append('ALREADY-RERECORDED')
    if not live: flags.append('NOT-SERVED')
    if len({t.lower() for t in texts}) > 1: flags.append('SLOTS-DIFFER:' + ' | '.join(texts))
    if len({(exp.get(t) or '').lower() for t in texts}) > 1: flags.append('EXPANSIONS-DIFFER')
    if t2.get(c): flags.append('SHARED-T2')
    bad = gender_check(label, send, r['word_pair'])
    status = 'BLOCKED:' + ';'.join(bad + flags) if (bad or flags) else ('HOLD: ' + HOLD[c[:8]] if c[:8] in HOLD else 'ok')
    out.write('\t'.join([c, r['verdict'], r['word_pair'], ','.join(x[0] for x in live), ','.join(t2.get(c, [])), label, send, src, r['female_text'],
                         str(len(send)), 'pass' if not bad else 'FAIL ' + ';'.join(bad), status, live[0][2] if live else '', live[0][3] if live else '']) + '\n')
out.close()
