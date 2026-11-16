#!/usr/bin/env python3
"""cs #142: first-pass triage of each changed word by the two words before it (the verb that carries its subject).
FIRST = a first-person verb (the female speaker) -> candidate pass; SECOND = a second-person verb (you) -> skip;
anything else -> 'read' (judged by hand from the known English and seed; verdicts in judged-142.tsv)."""
import csv, re, difflib, sys
FIRST = re.compile(r"\b(estoy|estaba|estaré|estuve|estuviera|siento|sentía|sentirme|sentirnos|quedarme|dejarme|soy|era|je|suis|sens|sentir|estou|estava|sinto|sentir-me|vou|j)\b", re.I)
SECOND = re.compile(r"\b(estás|estés|estabas|estarás|deberías|tu|te|estás|vais|devias|eres)\b", re.I)
def triage(c):
    out = []
    for r in csv.DictReader(open(f'ops/female-gender-gap-142/diff-142-{c}.tsv'), delimiter='\t'):
        a = re.findall(r"[\w'’-]+", r['stored_text']); b = re.findall(r"[\w'’-]+", r['female_text'])
        vs = []
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
            if op == 'equal': continue
            pre = ' '.join(a[max(0, i1 - 3):i1])
            vs.append('you' if SECOND.search(pre) else 'I' if FIRST.search(pre) else 'read')
        out.append((r, 'you' if 'you' in vs else 'I' if all(v == 'I' for v in vs) else 'read'))
    return out
if __name__ == '__main__':
    c = sys.argv[1]
    for i, (r, t) in enumerate(triage(c), 1):
        if len(sys.argv) < 3 or t == sys.argv[2]: print(i, t, '|', r['changes'], '|', r['stored_text'], '|', r['known'], '|', r['seed_text'][:110])
