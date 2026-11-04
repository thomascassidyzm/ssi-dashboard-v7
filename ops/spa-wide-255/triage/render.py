#!/usr/bin/env python3
"""render.py — writes triage/final/HANDOFF-clear.md and REPORT.md from triage/final/*.jsonl + stats.json."""
import json, os, collections
H = os.path.dirname(os.path.abspath(__file__)); F = f'{H}/final'
def load(n): return [json.loads(l) for l in open(f'{F}/{n}.jsonl') if l.strip()]
clear, kai, nat, fal = load('clear'), load('kai'), load('native'), load('false'); st = json.load(open(f'{F}/stats.json'))
def pair(p): return f"{p[0]} | {p[1]}" if p else ''
def sn(i): return int(i[1:5])
# ---------- handoff ----------
L = ["# spa_for_eng — CLEAR fixes, apply-ready handoff (#255·AD, 4 Nov 2026)", "",
 f"**{len(clear)} rows**, every one a practice phrase (BUILD or USE) under a played LEGO. No seed, LEGO or intro text changes here: those are all in the NEEDS-KAI list of the report. "
 f"{sum(1 for r in clear if (r['after'] or ['',''])[1]=='DELETE')} rows are deletes; the rest are rewords.", "",
 "**Checked on 4 Nov against a fresh read of the live course (after #259·AD):** every row's *before* text matches the live row (0 drift); every reword passes the gates in `ops/spa-wide-255/gates.py`: no untaught target word (P1/P2), the phrase still holds its LEGO (P17/K49), and no new same-English→two-Spanish clash for USE rows (K2/P16). Every delete leaves its basket at ≥4 USE and ≥1 BUILD with all deletes counted together. Exceptions are named on the row (`override`): 5 agreement fixes whose feminine/plural form the surface-form gate counts as new (K27 over K21), 4 'al otro lado' rows (al = a + el), and 8 rows whose LEGO was already present only as an article/clitic variant before the fix.", "",
 "**How to apply (for the canon-trained applier):** the machine-readable list is `ops/spa-wide-255/triage/final/clear.jsonl` on branch `cs/255-spa-wide-grammar-sweep` of the Popty repo (fields: id, before [known, target], after [known, target or \"DELETE\"], reason, rule, knock_on, knock_on_of). Re-read the live row first and skip any whose text has moved. Then Popty `POST /api/production/spa_for_eng/edit-batch` (dry run, then `\"apply\": true`). Unapprove each touched seed (O5). Fill only the empty slots through `POST /api/audio/render`, library first and dry run first. Most English-only rewords need a new known clip only. The `knock_on` field lists rows elsewhere carrying the same defect; those rows are already in this list as their own entries.", "",
 "Rules cited: K9 English grammatical/natural · K14 move the English when the Spanish fix needs an untaught form · K16 Spanish correct/natural · K26 person matches · K27 agreement follows the noun present · P7 no fragment as USE · P17 holds its LEGO · P28 use the taught form · 'Kai 30 Oct object rule' a dropped object counts.", ""]
by = collections.defaultdict(list)
for r in clear: by[sn(r['id'])].append(r)
for s in sorted(by):
    L.append(f"## Seed {s}")
    for r in by[s]:
        a = r['after'] or ['', '']
        ko = f" · knock-on of {r['knock_on_of']}" if r.get('knock_on_of') else ''
        ko += f" · same defect also in {', '.join(r['knock_on'])}" if r.get('knock_on') else ''
        ov = f" · override: {r['gate_override']}" if r.get('gate_override') else ''
        if a[1] == 'DELETE':
            L.append(f"- **{r['id']}** DELETE — was: {pair(r['before'])}  \n  {r['reason']} *({r['rule']}{ko}{ov})*")
        else:
            L.append(f"- **{r['id']}** {pair(r['before'])}  \n  → **{pair(a)}**  \n  {r['reason']} *({r['rule']}{ko}{ov})*")
    L.append("")
open(f'{F}/HANDOFF-clear.md', 'w').write('\n'.join(L))
# ---------- report ----------
belts = ['1-39', 'Green 40-79', 'Blue 80-149', 'Purple 150-280', 'Purple+ 281-668']
R = ["# spa_for_eng wide quality sweep: what learners hear (#255·AD, 4 Nov 2026)", "",
 "Kai asked for this after a learner wrote that mistakes 'have become increasingly frequent, particularly from the Green Belt onwards and throughout the Blue Belt'. I checked every played practice phrase (14,946), all 668 seeds, every new LEGO and every LEGO intro. **Nothing has been changed in the course:** by Kai's ruling of 4 Nov, a separate canon-trained agent applies the CLEAR list.", "",
 "## The one line for the learner", ""]
R.append("Real defects per 100 played phrases, before → after the CLEAR fixes: " + "; ".join(f"**{b}** {st['per100_before'][b]} → {st['per100_after'][b]}" for b in belts) + ".")
R += ["", "Two caveats. *Before* is a floor: the detector catches about 86% of known language errors (calibration below). *After* assumes the CLEAR list is applied and counts what is left, which is the NEEDS-KAI and NEEDS-NATIVE rows.", "",
 "## How it was done", "",
 "1. **Detect.** Sonnet read every played basket with its seed, LEGO and earlier taught pairs, and every seed, LEGO and intro, looking for Spanish grammar, unnatural Spanish, meaning mismatch, bad English, tú/usted mixing and nonsense. Haiku read seeds 40-280 a second time. On 142 known past fixes (#99, seeds 153-200) that the prompt was never tuned on, Sonnet caught 95 of 111 grammar, meaning and mood defects (86%); Haiku alone caught 75%. The detector does not see structural defects (containment, ZUT, untaught forms: 0-30%).",
 "2. **Second read.** Sonnet re-read all 2,963 flags: 1,094 confirmed, 1,869 rejected.",
 f"3. **Hand triage (Opus).** Six readers, one per seed band (A-C: #316·AD, #317·AD, #318·AD; D-F: me), read every confirmation in full against its LEGO, seed, basket and the canon. Result: **{len(clear)} CLEAR**, **{len(kai)} NEEDS-KAI**, **{len(nat)} NEEDS-NATIVE**, **{len(fal)} FALSE**. Every CLEAR passed the course gates.", "",
 "## Where the defects are (played phrases)", "", "| belt | played phrases | defects found | per 100 | after CLEAR |", "|---|---|---|---|---|"]
for b in belts: R.append(f"| {b} | {st['played_phrases'][b]} | {st['defective_played_rows'].get(b,0)} | {st['per100_before'][b]} | {st['per100_after'][b]} |")
R += ["", "By type (played phrases with a real defect):", ""]
for b in belts: R.append(f"- **{b}**: " + ", ".join(f"{k} {v}" for k, v in sorted(st['by_type'].get(b, {}).items(), key=lambda x: -x[1])))
R += ["", "So the learner is right about the shape: the rate roughly doubles from Green (1.2) to Blue (3.7) and doubles again into Purple (7.4). Seeds 281-668 sit at the same level. The big families:", "",
 "- **Seeds 80-149:** English and Spanish saying different things (a dropped 'it', 'right', 'too' or 'just', a wrong tense), plus missing 'lo' in 'lo estás haciendo bien'.",
 "- **Seeds 150-280:** past-frame tense errors ('dije que quería verte antes de que te vayas'), missing personal 'a', 'decir de / preguntar de' calques, and agreement slips ('la reunión … listo').",
 "- **Seeds 281-668:** a past frame with a present verb ('sabía que ya entienden', 'estaba seguro de que saben'), 'cuando termino' for the future, gender with neuter 'lo'/'eso'/'esto', and padding rows built by a generator ('guess here, good', 'whoever said before, no', 'in three or four minutes at the end'). There is also a cluster of LEGOs that teach a subjunctive with no trigger ('podáis', 'conociera', 'no estén hablando en serio', 'donde pueda').", "",
 "## What the CLEAR list fixes (examples)", ""]
ex = ['S0107L03B02', 'S0281L02U02', 'S0425L01U04', 'S0464L02U04', 'S0488L01U01', 'S0549L01U04', 'S0636L01U04', 'S0554L01B03']
cm = {r['id']: r for r in clear}
picked = [cm[i] for i in ex if i in cm] or clear[:8]
for i in [r for r in clear if 80 <= sn(r['id']) < 150 and (r['after'] or ['',''])[1] != 'DELETE'][::12][:6]: picked.append(i)
seen = set()
for r in picked:
    if r['id'] in seen: continue
    seen.add(r['id']); a = r['after']
    R.append(f"- **{r['id']}**: {pair(r['before'])} → {'deleted' if a[1]=='DELETE' else pair(a)}. {r['reason']}")
R += ["", f"Full apply-ready list ({len(clear)} rows, before → after, reason, canon rule, knock-ons): see the handoff document published with this report.", "",
 "## NEEDS-KAI", "", "Grouped by root: each root is followed by the rows that move with it. All seed, LEGO and intro edits are here.", ""]
grp = collections.OrderedDict()
for r in sorted(kai, key=lambda r: r['id']): grp.setdefault(r.get('knock_on_of') or r['id'], []).append(r)
for root, rs in sorted(grp.items(), key=lambda x: x[0]):
    head = next((r for r in rs if r['id'] == root), rs[0])
    others = [r['id'] for r in rs if r is not head]
    R.append(f"- **Seed {sn(root)} · {head['id']}**: {pair(head['before'])}  \n  {head['reason']}" + (f"  \n  **Proposal:** {head['proposal']}" if head.get('proposal') else '') + (f"  \n  Moves with it: {', '.join(others)}" if others else ''))
R += ["", "**LEGO intros that do not quote their LEGO**, from reading all 1,314 intro lines through Popty: S0069L01 says 'young' for 'the dog'; S0505L02 says 'I don't get' for 'I don't stay'; S0531L01 says 'whoever' for 'anyone'; S0524L01 says 'call you back' for 'I'll call you'; S0432L01's 'as in' line ('we want you to ask') does not contain 'you ask'; S0529L01 adds a '?'. Each needs its intro re-voiced.", "",
 "## NEEDS-NATIVE: questions for Deborah", ""]
qs = collections.OrderedDict()
for r in sorted(nat, key=lambda r: r['id']):
    root = r.get('knock_on_of') or r['id']; qs.setdefault(root, []).append(r)
n = 0
for root, rs in qs.items():
    head = next((r for r in rs if r['id'] == root), rs[0]); n += 1
    q = head.get('question') or head['reason']
    R.append(f"{n}. {q}  \n   *(rows: {', '.join(r['id'] for r in rs)})*")
R += ["", "## Gaps (honest)", "",
 "- **Structural defects were not hunted.** The detector is calibrated for language and meaning (86% recall). Containment, ZUT and untaught-form problems surfaced only where they came with a language error.",
 "- **The rate is a floor.** About 14% of language defects slip past the detector, and FALSE judgements are ours. Spanish is not Kai's language: 64 rows wait for Deborah.",
 "- **Intro mirror check:** the committed `tools/check-intro-mirror.cjs` fails on spa_for_eng with a database error (`uuid ~* unknown`), so intros were checked by reading each line through Popty's presentation route instead.",
 "- **17 second-read confirmations had garbled ids.** The 8 that were intros are covered above; the 9 seed-level ones are covered by their seed's own entries.",
 "- **Nothing is applied.** No audio has been made, and the numbers in the 'after' column describe the course once the CLEAR list is applied.",
 "- Machine outputs (snapshots, raw model reads) are in `~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255/` on watson-1. The harness and triage decisions are on branch `cs/255-spa-wide-grammar-sweep`."]
open(f'{F}/REPORT.md', 'w').write('\n'.join(R))
print(len('\n'.join(L)), len('\n'.join(R)))
