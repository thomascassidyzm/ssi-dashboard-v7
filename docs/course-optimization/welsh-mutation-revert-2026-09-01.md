# Welsh mutation edits — reverted in full

*2026-09-01. Kai's ruling, verbatim: **"Oh, there is no need to fix the text. Welsh is
hand-built. the decision to do it like that was made by Aran. It is fine as it is. Please
undo the fixes. The point is it doesn't make much difference, barely sounds different."***

The Welsh courses are hand-built and the mutated form on the card is Aran's authoring
choice, not a defect. Everything today's bound-form pass changed in the three Welsh
courses has been put back. The other 17 courses in that pass were not touched.

---

## What today's pass had changed, and what is now back

Eight LEGO cards, in three courses. Nothing else in Welsh was ever touched — no practice
phrases, no seeds, no narration scripts.

| Course | Card | Pass changed it to | Now reads (original) |
|---|---|---|---|
| `cym_s_for_eng` | `S0121L01` "to eat" | `bwyta` | **`fwyta`** |
| `cym_s_for_eng` | `S0189L01` "to happen" | `digwydd` | **`ddigwydd`** |
| `cym_s_for_eng` | `S0199L01` "to make sure" | `gwneud yn siŵr` | **`wneud yn siŵr`** |
| `cym_s_for_eng` | `S0292L06` "coffee" | `coffi` | **`goffi`** |
| `cym_n_for_eng` | `S0266L02` "many reasons" | `llawer o resymau` | **`lawer o resymau`** |
| `cym_n_for_eng` | `S0266L05` "the end" | `diwedd` | **`ddiwedd`** |
| `cym_nnew_for_eng` | `S0266L02` "many reasons" | `llawer o resymau` | **`lawer o resymau`** |
| `cym_nnew_for_eng` | `S0266L05` "the end" | `diwedd` | **`ddiwedd`** |

**Per course: `cym_s_for_eng` 4 rows, `cym_n_for_eng` 2 rows, `cym_nnew_for_eng` 2 rows —
8 in total.**

## The audio

The pass had also moved audio links around, because changing a card's text automatically
re-points or drops its recording. All of that is undone too:

- **Six links that had been swapped onto different human takes** (`cym_s`: to eat, to
  happen, to make sure) now point back at the takes they pointed at this morning.
- **Four cards that had been left silent** (`cym_s` coffee; `cym_n` and `cym_nnew` many
  reasons / the end) have their original Aran and Catrin takes back on them. No card in
  any Welsh course is silent as a result of today.
- **All eight of Aran's spoken introductions** were nulled by the edit and are back on
  their original clips.
- **The six "please re-record this" flags** the pass raised are cleared. Nothing in Welsh
  is waiting on a recording session because of today.
- **No audio was generated.** No TTS ran on any Welsh course at any point — the queue
  refuses these courses by design and it was never asked. **No clip was deleted**, this
  morning or now.

93 re-record flags remain on `cym_n_for_eng`. All of them pre-date today (Kai's 2026-08-19
Welsh-eyes ruling, and the 2026-08-14 tail-integrity sweep). None were touched.

## How it was verified

Every row was read back after the revert and compared field-by-field against the snapshot
the database itself took *before* the pass wrote (`content_audit_log`, which stores the
whole row as it was). Text, both target recordings, the known-side recording, the
introduction, the stored clip durations, status, index and seed number: all eight rows
match their pre-pass state exactly.

## Nothing left over

- `cym_s_for_eng` `S0279L01` "a big world" → `fyd mawr` was flagged this morning but held
  for Kai and never edited. It still reads `fyd mawr`. Nothing to undo.
- The eight North-Welsh build fragments (`lawer o resymau i ystyried`, `ddiwedd yr ail
  hanner` and so on) were listed but deliberately not edited. Confirmed unchanged.
- One unrelated `cym_s_for_eng` pod row was touched at 06:53 by a different job, hours
  before this pass, with no visible change to its content. Out of scope, left alone.

## Gaps

**None.** Every change was recoverable and every one was recovered.
