#!/usr/bin/env python3
"""cs #142: the judgement on every bucket=fix clip, applying Kai's rule (16 Nov): male is the default; the female form ONLY
where the changed word refers to the female speaker or to a woman / feminine noun. Row numbers are 1-based positions in
diff-142-<course>.tsv (the #131 fix list order). Every row not named below was read and passes: each changed word refers to
the speaker ("I"), including LEGO fragments whose seed is first person. Output: judged-142-<course>.tsv."""
import csv
YOU = "refers to 'you', no female referent: male default"
HE = 'refers to a man (he / my son / the young man)'
IT = 'refers to a thing (it / masculine noun): male default'
GEN = 'generic or impersonal (no one in particular): male default'
PL = 'plural (we / they / together): not a female referent'
SEEDHE = 'LEGO fragment of a seed about "he": male default'
UNEST = 'fragment whose seed does not establish a female referent'
BAD = 'female reading is itself wrong here (form does not agree or does not exist): flag for Kai, not rendered'
SKIP = {
 'fra_for_eng': {60: YOU, 62: YOU},
 'por_for_eng': {18: SEEDHE, 19: SEEDHE, 21: SEEDHE, 27: SEEDHE, 65: UNEST, 66: IT + ' (muito divertido = "very fun", about learning Portuguese)',
   80: YOU, 93: YOU, 96: YOU, 126: YOU, 128: YOU, 129: YOU, 130: YOU, 131: YOU, 132: YOU, 144: YOU,
   127: 'LEGO fragment of seed 95 "are you ready to go home": male default', 133: 'LEGO fragment of seed 95 "are you ready to go home": male default',
   81: BAD + ' (Portuguese "contente" is invariable; "contenta" is not standard)', 82: BAD + ' (Portuguese "contente" is invariable; "contenta" is not standard)'},
 'spa_for_eng': {
   **{n: YOU for n in [13,14,15,16,62,119,121,170,172,192,198,199,219,226,230,232,266,267,275,283,286,336,348,367,394,395,397,398,399,
                       418,419,420,421,422,423,424,425,426,427,428,429,444,532,542,545]},
   21: BAD + ' (lo rápido que = "how quickly", adverbial, stays rápido)', 22: BAD + ' (lo rápido que = "how quickly", adverbial)',
   56: BAD + ' (lo suficientemente rápido = "quickly enough", adverbial)', 57: BAD + ' (hablando lo suficientemente rápido = adverb)',
   71: BAD + ' (Solo = "just/only", adverb; "Sola quiero" is wrong)', 72: BAD + ' (Solo = "just", adverb; "Sola un poco" is wrong)',
   559: BAD + ' (me habría atrevido: participle in a compound tense never agrees)',
   73: PL, 144: PL + ' / generic (trabajando juntos, "when you work together")', 501: PL, 502: PL, 516: PL, 521: PL + ' (they; casi hecho)', 522: PL, 531: PL + ' (tus ojos)',
   **{n: GEN for n in [98,99,145,147,148,149,150,151,152,153,154,155,156,157,158,211,263]},
   111: HE, 306: HE + ' (mi hijo trabaja como profesor)', 307: HE, 368: HE, 406: HE + ' (English: "I think he should be ready")', 465: HE,
   471: HE, 473: HE, 475: HE, 533: HE, 526: HE, 527: SEEDHE, 528: SEEDHE, 529: SEEDHE, 530: HE,
   478: SEEDHE, 479: SEEDHE, 480: SEEDHE, 482: SEEDHE, 483: SEEDHE + ' / generic',
   **{n: HE + ' (estaba callado = "he was quiet")' for n in [484,486,489,490,494,495]}, 485: SEEDHE, 487: HE, 488: HE, 491: SEEDHE, 492: SEEDHE, 493: HE,
   312: 'LEGO fragment of seed "nobody was sure": nadie takes the male default', 313: 'LEGO fragment of seed "nobody was sure": nadie takes the male default',
   454: IT, 456: IT, 496: IT, 497: IT, 498: IT, 499: IT, 500: IT, 523: IT, 554: IT + ' (lo sensato)', 557: IT, 558: IT,
   469: UNEST,
 }}
for c, skip in SKIP.items():
    rows = list(csv.DictReader(open(f'ops/female-gender-gap-142/diff-142-{c}.tsv'), delimiter='\t'))
    clips = {r['clip']: r for r in csv.DictReader(open(f'ops/female-gender-gap-131/clips-131-{c}.tsv'), delimiter='\t')}
    assert max(skip) <= len(rows)
    with open(f'ops/female-gender-gap-142/judged-142-{c}.tsv', 'w') as o:
        o.write('n\tclip\tverdict\treason\tchanges\tstored_text\tfemale_text\tknown\tchars\tslots\n')
        for i, r in enumerate(rows, 1):
            why = skip.get(i)
            o.write('\t'.join([str(i), r['clip'], 'skip' if why else 'pass', why or 'each changed word refers to the female speaker', r['changes'],
                               r['stored_text'], r['female_text'], r['known'], clips[r['clip']]['chars'], clips[r['clip']]['slots']]) + '\n')
    p = [r for r in csv.DictReader(open(f'ops/female-gender-gap-142/judged-142-{c}.tsv'), delimiter='\t')]
    ps = [x for x in p if x['verdict'] == 'pass']
    print(c, 'pass', len(ps), sum(int(x['chars']) for x in ps), 'chars; skip', len(p) - len(ps), '(bad reading', sum(1 for x in p if x['reason'].startswith('female reading')), ')')
