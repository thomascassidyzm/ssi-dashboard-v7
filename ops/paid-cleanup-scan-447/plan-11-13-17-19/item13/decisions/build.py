#!/usr/bin/env python3
"""Item 13 (one prompt, two answers) — hand-authored decisions, cs #784·AI. Writes decisions/<course>.json (schema: tools/plan.py).
Patterns: P = person not carried by the English (K26) — the later form takes its pronoun; G = a gender/number form of one
word — it grows to the noun/subject in its own seed, which shows why it differs (L34); S = LEGO does not say what its seed
says, and saying it removes the clash (L26); U = unify to one form (L34 first remedy), the later LEGO becomes not-new;
W = two real words for one English word — the one that cannot stand alone grows to its seed piece (L34 second remedy);
R = a ROW (not a LEGO) gives a second answer to a taught prompt — reword or delete the row. PLAN ONLY.
usage: python3 -I build.py   (each course section appends; parts are in parts/*.py and exec'd in name order)"""
import json, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
D = {}
def add(course, **d): D.setdefault(course, []).append(d)
K26 = "K26: 'the PERSON must match on both sides — where the target verb marks a person the known language marks with a pronoun, the known side carries that pronoun'. "
L34 = "L34: 'one English prompt with two target answers: FIRST try to unify to one target form; only if the target language genuinely needs both, put one inside a larger LEGO, and that LEGO must make clear WHY it differs'. "
L26 = "L26: 'a LEGO may contain only words its own seed says, on the known side and the target side alike'. "
DUP = "L27: 'a LEGO that grows into one that already exists is a duplicate and is introduced once' — so the later copy goes not-new, and (P25) its rows stop playing. "
def notnew(seed, idx, k, t): return {'op': 'lego.insert', 'row': {'seed_number': seed, 'lego_index': idx, 'known_text': k, 'target_text': t, 'type': 'A', 'is_new': False}}
for f in sorted(glob.glob(os.path.join(HERE, 'parts', '*.py'))):
    exec(compile(open(f).read(), f, 'exec'))
for course, legos in D.items():
    json.dump({'course': course, 'legos': legos}, open(os.path.join(HERE, f'{course}.json'), 'w'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in D.items()}, sum(len(v) for v in D.values()))
