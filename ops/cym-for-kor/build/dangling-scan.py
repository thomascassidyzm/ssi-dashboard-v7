#!/usr/bin/env python3
"""cym_for_kor (cs #813·AK): list BUILD phrases that STOP where Welsh needs something after the last word
(Kai's Watson, 23 Nov: 'bydden, achos maen nhw angen' is broken, not a fragment). Reads a snapshot file
written by GET :3470/api/production/cym_for_kor/seeds?status=all — never the database. Flags are candidates
for a person to read; complete short fragments ('dylen, am mor hir â phosib') must not be flagged.
Usage: dangling-scan.py SNAPSHOT.json [--json OUT]"""
import json, re, sys

# Last words that cannot end a Welsh utterance: needing, conjunctions and linkers, prepositions, the
# predicative/aspect 'yn', 'wedi' with nothing after it, articles and possessives. Content verbs that can be
# intransitive (mynd, gorffen, deud, licio) and adjectives (newydd, mwy) are NOT here: 'dw i isio mynd' is complete.
NEEDS_MORE = {
    'angen', 'ond', 'achos', 'bod', 'bo’', 'fod', 'mai', 'nad', 'os', 'pan', 'tra', 'yn', 'efo', 'gyda', 'hefo',
    'am', 'â', 'ag', 'a', 'ac', 'fel', 'ar', 'at', 'wrth', 'heb', 'tan', 'nes', 'i’r', 'y', 'yr', '’r', 'ei', 'fy',
    'dy', 'ein', 'eich', 'eu', 'ym', 'yng', 'mewn', 'drwy', 'trwy', 'dros', 'rhwng', 'oherwydd', 'gan', 'wedi',
    'mor', 'rhy', 'na', 'â’r', 'efo’r', 'ond’',
}
# 'i' is a preposition ('mynd i', 'angen i') or the pronoun 'I' ('dw i', 'fedra i'); it needs more only after these.
I_NEEDS_MORE_AFTER = {'mynd', 'isio', 'angen', 'eisiau', 'gofyn', 'helpu', 'amser', 'gyfle', 'cyfle', 'ffordd',
                      'rhaid', 'well', 'bwysig', 'pwysig', 'hawdd', 'anodd', 'bosib', 'ar', 'ôl'}


def tokens(t):
    return re.sub(r'[?!.,]', ' ', t.replace("'", '’')).lower().split()


def dangles(target, known=''):
    # The Korean prompt still showing the LEGO's '~' slot means the frame was never filled.
    if '~' in (known or ''):
        return '~ in prompt'
    w = tokens(target)
    if not w:
        return None
    last, prev = w[-1], (w[-2] if len(w) > 1 else '')
    if last == 'i':
        return f'i after {prev}' if prev in I_NEEDS_MORE_AFTER else None
    if last == 'na' and len(w) == 1:
        return None  # 'na' = no
    if last in ('na',) and prev not in ('mwy', 'gwell', 'llai', 'well'):
        return None  # only comparative 'na' (than) dangles; 'na' = no / that-not otherwise
    return last if last in NEEDS_MORE else None


def main():
    d = json.load(open(sys.argv[1]))
    n, hits = 0, []
    for s in d['seeds']:
        for l in s.get('legos') or []:
            for p in l.get('basket_phrases') or []:
                if p.get('phrase_role') != 'build':
                    continue
                n += 1
                why = dangles(p['target_text'], p['known_text'])
                if why:
                    hits.append({'id': p['id'], 'seed': s['seed_number'], 'lego': l['lego_id'], 'lego_target': l['target_text'],
                                 'lego_known': l['known_text'], 'known': p['known_text'], 'target': p['target_text'], 'why': why})
    print(f'{n} BUILD phrases scanned, {len(hits)} flagged')
    for h in hits:
        print(f"{h['id']}\t[{h['why']}]\t{h['target']}\t|\t{h['known']}")
    if '--json' in sys.argv:
        json.dump(hits, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
