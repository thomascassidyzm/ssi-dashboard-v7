#!/usr/bin/env python3
"""fra_for_eng #195 wave-1 mismatch rows (job #238, Kai approved 4 Nov 12:59Z) — every row read in full against LIVE.
Input: the 37 CONFIRM rows (cause != dropped-object) of ~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl;
all 37 still read exactly as the 30-31 Oct snapshot in the 4 Nov live pull (GET /api/production/fra_for_eng/seeds).
Output: tools/course-optimization/fra-mismatch-195-2026-11-04.data.cjs, run by the ita #36 engine with
DATA=<that file> (the engine takes COURSE/LANGUAGE from the data file).
Rules: English first; taught forms only (ici is taught as 'here' from S0034L04, là as 'there' from S0157L02, so a
'here | là' pair is fixed by saying 'there' — except seed 454, where 'came round there' reads badly and ici is taught);
seed edits, naturalness calls and LEGO-containment questions with no clean taught fix are HELD for Kai.

DROPPED-OBJECT (23 rows, all skipped): in French an object clitic is NOT optional — 'nous devons discuter aujourd'hui'
for 'we need to discuss it today' is incomplete French, so these are real defects (unlike Chinese). The fix is the
Italian #650 shape (an object clitic le/l'/en that may not be taught at that seed: le discuter 210, l'atteindre 358,
j'en ai bu 217) or an English-side rewrite (drop 'it'/'some'), and which to use is Kai's call per #650 — the whole
class is HELD for Kai, nothing fixed."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FIND = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl')
E, D, H, K = 'edit', 'delete', 'hold', 'keep'
# id: (action, known | None, target | None, why)
DEC = {
 'S0109L01U07': (E, "we must work hard before we change what we're doing", None, "English first: 'avant de changer' has no 'can'"),
 'S0117L03U10': (H, "I'm definitely doing better than I was last time we talked", None, "copy of seed 117 — the SEED English says 'to each other', which 'nous avons parlé' does not; a seed edit is Kai's"),
 'S0143L03B01': (E, 'earlier', None, "English first: 'tout à l'heure' is the LEGO 'earlier'; no 'today'"),
 'S0143L03U01': (E, 'I wanted to help you earlier', None, "English first: no 'today' in the French"),
 'S0146L01U09': (E, 'Why are you not happy any more, nothing seems to be working?', None, "English first: 'n'es-tu plus heureux' is taught at seed 145 as 'not happy any more'"),
 'S0183L01U06': (E, 'do you want to have them?', None, "English first: 'voulez-vous les avoir' says 'to have them'"),
 'S0213L01B04': (E, "we don't know this", None, "English first: no 'about' in 'nous ne savons pas ça'"),
 'S0218L01B04': (E, "didn't do much on Sunday", "n'ai pas fait grand-chose dimanche", "the row was a fragment ('on | le'); now the seed's own ending (dimanche, seed 218), not a twin of U08 (which has 'I')"),
 'S0365L01U04': (H, None, None, "'she told him what she said | elle lui a dit ce qu'elle lui a dit' — the LEGO needs 'to him', and 'she told him what she said to him' is a tautology; proposed 'he told me what she said to him | il m'a dit ce qu'elle lui a dit', but 'm'a dit' is first taught at seed 589"),
 'S0377L01U02': (E, 'it was last year', None, "English first: 'c'était' is 'it was'"),
 'S0377L02B03': (E, 'nowhere in the world', None, "English first: 'nulle part' is taught as 'nowhere' (S0376L03)"),
 'S0419L02B02': (E, 'that people like them there', None, "English first: là is taught as 'there' (S0157L02)"),
 'S0434L04B02': (E, 'of students they take there', None, "English first: là is taught as 'there'"),
 'S0436L01U01': (E, 'there is something there', None, "English first: là is taught as 'there'"),
 'S0436L01U03': (E, 'there is something there for us', None, "English first: là is taught as 'there'"),
 'S0439L02U02': (E, "they don't want to die there", None, "English first: là is taught as 'there'"),
 'S0451L02B04': (E, 'what they wanted to do there', None, "English first: là is taught as 'there'"),
 'S0453L02B02': (E, 'who they saw there', None, "English first: là is taught as 'there'"),
 'S0454L02B02': (E, None, 'sont passés ici', "'came round there' reads badly, so the French follows: ici is taught as 'here' (S0034L04)"),
 'S0454L02U05': (E, None, 'ils sont passés ici', "as B02: ici for 'here'"),
 'S0455L03B02': (E, 'were tired there', None, "English first: là is taught as 'there'"),
 'S0469L02U05': (E, "we can't do much", "on ne peut pas faire grand-chose", "English first: grand-chose is taught as 'much' (S0218L01); spelling hyphenated as taught"),
 'S0472L01U02': (E, "we don't know the problem well", None, "English first: no très in the French"),
 'S0474L01B03': (E, 'even there', None, "English first: là is taught as 'there'"),
 'S0480L03U01': (D, None, None, "'not anymore | plus du tout' — 'du tout' is unmatched and no English reads naturally for it ('not at all any more'); 4 USE rows remain"),
 'S0493L01B03': (E, 'not to arrive', None, "English first: 'pas arriver' is 'not to arrive', the shape of S0439L02B02 'not to die | pas mourir'"),
 'S0493L02U02': (K, None, None, "'et toi ensuite ?' is how French asks 'what's next for you?' — the question word is left unsaid colloquially"),
 'S0493L02U03': (K, None, None, "'alors ensuite ?' is how French says 'so what's next?' — natural spoken French"),
 'S0511L06U05': (E, 'she wants to tell everyone in the office the news', None, "English first: the French says 'la nouvelle', as B03/U02 'tell everyone in the office the news'"),
 'S0512L03U03': (E, 'can you stay while I go fetch the keys?', None, "English first: rester is taught as 'to stay' (S0276L01)"),
 'S0527L03B03': (E, 'who told me all that', None, "English first: 'tout ça' is 'all that'"),
 'S0557L01B04': (E, "they don't play often", None, "English first: no très in the French"),
 'S0642L02U03': (E, None, "j'aimerais savoir comment vous sentez-vous madame", "the row lacked its LEGO's 'madame'"),
 'S0642L02U04': (E, None, 'pouvez-vous me dire comment vous sentez-vous madame ?', "the row lacked its LEGO's 'madame'"),
 'S0651L01B02': (H, None, None, "lacks 'madame', but 'qu'en pensez-vous de cela' is itself doubled (en + de cela) — a native check held since #452; proposed 'what do you think about this madam? | que pensez-vous de cela madame ?' or delete"),
 'S0651L01U04': (H, None, None, "lacks 'madame', and 'qu'en pensez-vous de cette idée' doubles en + de; proposed 'que pensez-vous de cette idée madame ?' (no longer holds the LEGO 'qu'en pensez-vous madame') — native check"),
 'S0666L01U04': (E, "I'd like to know what you all think", None, "English first: 'j'aimerais savoir' is 'I'd like to know'"),
}

def main():
    rows = [json.loads(l) for l in open(FIND)]
    fr = {r['id']: r for r in rows if r['course'] == 'fra_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] != 'dropped-object'}
    dropped = [r for r in rows if r['course'] == 'fra_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] == 'dropped-object']
    assert set(fr) == set(DEC), (set(fr) ^ set(DEC))
    fixes, held, kept = [], [], []
    for i, (a, k, t, why) in sorted(DEC.items()):
        r = fr[i]; now = [r['known'], r['target']]; tag = f"#195 {r['severity']}/{r['cause']}: {why}"
        if a == E: fixes.append([i, r['cause'], now, [k, t], tag])
        elif a == D: fixes.append([i, r['cause'], now, None, tag])
        elif a == H: held.append({'id': i, 'seed': r['seed'], 'now': now, 'proposal': [k, t], 'reason': why})
        else: kept.append({'id': i, 'seed': r['seed'], 'now': now, 'reason': why})
    for r in dropped:
        held.append({'id': r['id'], 'seed': r['seed'], 'now': [r['known'], r['target']], 'proposal': [None, r['fixed_target']],
                     'reason': 'dropped-object class held whole (#650 shape): French needs the object clitic; judge suggests the target shown, or drop the English object'})
    out = os.path.join(ROOT, 'tools/course-optimization/fra-mismatch-195-2026-11-04.data.cjs')
    with open(out, 'w') as f:
        f.write("'use strict';\n// GENERATED by ops/fra-mismatch-195/decisions.py — edit there, not here (job #238, Kai approved 4 Nov 2026).\n")
        f.write("// Rows: [id, class, [known now, target now], [known fix | null, target fix | null] | null (= delete), why].\n")
        f.write("// Run with the ita #36 engine: DATA=tools/course-optimization/fra-mismatch-195-2026-11-04.data.cjs node tools/course-optimization/ita-mismatch-36-2026-11-02.cjs …\n")
        for n, v in (('FIXES', fixes), ('HELD', held), ('KEPT', kept)):
            f.write(f"const {n} = {json.dumps(v, ensure_ascii=False, indent=1)};\n")
        f.write("module.exports = { COURSE: 'fra_for_eng', LANGUAGE: 'French', LOG_PREFIX: 'fra-195', JOB: '#238',\n"
                "  AGENT: 'fra-mismatch-195 (job #238)', PURPOSE: 'job #238 fra_for_eng #195 phrase-mismatch fixes (Kai approved 4 Nov) — refill of the slots these edits emptied',\n"
                "  FIXES, SEED_FIXES: [], LEGO_FIXES: [], HELD, KEPT };\n")
    print(f"fixes {len([x for x in fixes if x[3]])} edits + {len([x for x in fixes if not x[3]])} deletes, held {len(held)} (incl {len(dropped)} dropped-object), kept {len(kept)}")
main()
