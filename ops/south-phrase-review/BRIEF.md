# South Welsh practice-phrase review — shard brief (job #804 fan-out)

READ-ONLY. No DB writes, no commits, no publishing. You review ONE shard file and write ONE JSON file (plus one small LEGO file).
Scratch only in ~/.tmpbig/spr/work-XX/ (NOT $CS_SCRATCH — it is wiped).

CLAIM FIRST (a shard was accidentally dispatched twice): run `mkdir -p ~/.tmpbig/spr/work-XX && mkdir ~/.tmpbig/spr/work-XX/claim.d`.
If that second mkdir fails (claim.d exists) AND ~/.tmpbig/spr/work-XX/progress.txt or claim.d was modified less than 40 minutes
ago (`find ~/.tmpbig/spr/work-XX -maxdepth 1 -mmin -40`), another worker holds this shard: stop at once and report
"duplicate — shard XX held by another worker", landing line 'no commits'. If the claim is older than that, the earlier worker
died: take over (touch claim.d) and resume. Touch claim.d after every chunk.

RESUMABLE: if ~/.tmpbig/spr/out/shard-XX.json already exists and parses, your shard is done — report that and stop.
If ~/.tmpbig/spr/work-XX/ holds partial notes from an earlier interrupted run, continue from them rather than starting over.
Work in chunks of ~250 rows and append your flags for each chunk to ~/.tmpbig/spr/work-XX/flags.jsonl (one JSON object per line)
as you finish it, plus the last n you finished to ~/.tmpbig/spr/work-XX/progress.txt, so a restart loses at most one chunk.

Course: cym_sv2_for_eng — the SOUTH Welsh relaunch sandbox. Aran (Welsh methodology lead, native speaker) is proofing the same list
on popty.app/proof/phrases; your flags go to him. FALSE FLAGS WASTE HIS TIME — flag only what a careful native South Walian teacher
would agree is a problem. When in doubt between flagging and not, use severity Check rather than inventing a High.

## Input
Your shard: ~/.tmpbig/spr/shards/shard-XX.tsv (tab-separated, header row). Columns:
n (running number, matches the page) · id · lego_cy (the LEGO the phrase is filed under) · lego_en · welsh · english · auto.
auto carries: OLD or HC (HC = the new Hadau Creiddiol block, seed ids 1001+, rows #1637–#14142; OLD = the old course seeds 1–137
and 138+); LEGO-ABSENT / LEGO-SPLIT (machine pre-flag, only computed for HC rows: LEGO words not found even allowing mutation /
found in order with something inserted); DUP-OF-#n (exact duplicate of an earlier row).
Read the WHOLE shard with Read in chunks of ~250 lines. Every row must be looked at by you — do not regex-review Welsh.

## Flag categories (use the number)
1 wrong/unnatural Welsh — not how a South Walian would say it. SOUTH forms are CORRECT and must not be flagged: moyn, gyda ti/gyda fi,
  nawr, cwpla/gwpla, wedes/wedest, so (= dim / ddim, e.g. 'so fe'n…'), ni'n, 'sa i', 'smo fi', ffili, mas, lan, gweud/gweud, taw,
  'fe' particle, fe/fo→fe, dyw e ddim, chi'n, ti'n, o'n i, licen i, bydden i, 'sdim, gallu/galla i, odw/ydw, dere, bach, crwt/croten.
2 mutation error — soft/nasal/aspirate wrong or missing where a trigger IS present (missing soft mutation after 'i' (to), 'dy',
  'ei' (his), 'am', 'o', 'wrth', 'dau/dwy', adjective after fem. noun, object of an inflected verb; nasal after 'fy'/'yn' (in);
  aspirate after 'a' (and), 'ei' (her), 'tri', 'chwe', 'â'/'gyda'). ALSO flag a mutation with NO trigger. Aran's display rule:
  a word alone is unmutated (blasus); mutated only with its trigger (yn flasus). Spoken South usage is the standard, not the
  literary grammar book; a missing aspirate after 'a'/'gyda' that is normal in speech is Check at most.
  RULING: unmutated object 'tipyn bach' after a verb-noun is Aran's rule (siarad tipyn bach) — never flag it.
3 English doesn't match the Welsh meaning (tense, person, number, negation, a word missing or extra).
4 phrase doesn't contain the LEGO it is filed under — ONLY for HC rows (auto contains HC). Canon P17: every phrase under a LEGO must
  contain the WHOLE LEGO (mutated forms, 'r/'n clitics and contractions of the same words count). Verify each LEGO-ABSENT/SPLIT
  pre-flag: High if the LEGO is plainly not there, Check if it is a variant/insertion; dismiss silently if the LEGO really is
  there. RULING: NEVER flag category 4 on an OLD row — those were hand-built recap lines, deliberate.
5 Northern forms in the South course: isio, efo, chdi, rŵan, medru/fedra i, dudes/ddudes, deud, hogyn/hogan, licio(?—Check only),
  'dach chi', gynnoch chi, 'mae gen i' (South: 'mae … gyda fi'), naci, be' ti'sio etc. Severity High when it is clearly a North form.
6 nonsense / odd sense — a sentence nobody would phrase that way, or that doesn't make sense. Canon P14: "unlikely to come up" is
  NOT a defect; "nobody would phrase it that way" IS.
7 exact duplicate — every DUP-OF row: flag it (severity Check, reason "duplicate of #n").

## Aran's standing rulings — DO NOT FLAG
(a) a phrase missing its LEGO on an OLD row (see cat 4) · (b) 'yn y Gymraeg' (a wanted variant of 'yn Gymraeg') · (c) use of any
earlier-taught word, including ones met only inside chunks or soft-mutated; an occasional surprise word is OK too · (d) near-misses
like 'dyw fy mam ddim yn hoffi' under 'dyw hi ddim yn hoffi' · (e) 'am dipyn', 'trwy'r dydd', 'trwy'r coed', 'trwy'r prynhawn'
(already ruled) · unmutated object 'tipyn bach' after a verb-noun · dw i/dwi, beth/be', wedi/'di spelling variation · curly vs
straight apostrophes · sentence fragments (build phrases may be fragments) · a register choice that is merely one of several
natural options.

Severity: High = clearly wrong, Aran would fix it. Check = worth his look.

## LEGO-wide issues
If a LEGO itself is wrong (bad Welsh, Northern form, wrong gloss in lego_en, wrong mutation baked in), every phrase under it is
affected. Report it ONCE in ~/.tmpbig/spr/out/shard-XX.legos.json — a JSON array of
{"lego":"…","lego_en":"…","first_n":123,"rows":17,"sev":"High|Check","reason":"one line","fix":"corrected LEGO or ''"}
(write [] if none) — and in the main file flag only those phrases under it that have a problem of their own beyond the LEGO's.

## Output
Write ~/.tmpbig/spr/out/shard-XX.json LAST (its existence means "shard done") — a JSON array, one object per flag, in n order:
{"n":123,"id":"S1013L01B04","welsh":"…","english":"…","lego":"…","cat":2,"sev":"High","reason":"one line, plain English for Aran",
"fix":"corrected Welsh (or corrected English for cat 3) ONLY if confident, else empty string"}
A row may carry two flags (two objects). Copy welsh/english/lego verbatim from the shard. Validate both files parse
(python3 -m json.tool). End with a 3-line report: shard, rows read, flags by category/severity, LEGO-wide issues count,
anything you could not do.
