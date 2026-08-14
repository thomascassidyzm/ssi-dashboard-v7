# The M-LEGO mapping tool: what it derives, and how you fix what it gets wrong

2026-08-14. Two changes, on one branch, answering two things Tom said a minute apart.

---

## The number

Most rows should never need a human at all. Tom, 19:20Z: *"the DEFAULT mapping is
auto-generated from the existing LEGO components — no human effort to create the
initial alignment"*, and the drag tool exists only to fix what that gets wrong.

So the measurement is: of every M-LEGO nobody has hand-mapped, how many open
already correct? Measured across **all 92 courses, 39,917 rows**. A row counts as
correct when every gloss on it spans exactly its own component's target words —
checkable, not a judgement.

| | before | after |
|---|---|---|
| opens **correct** | 26,624 | **32,809** *(+6,185)* |
| opens **visibly wrong** | 8,542 | **2,364** *(−6,178 — 72% of them)* |
| opens **blank** | 4,751 | 4,744 |
| correct rate | 66.7% | **82.2%** |

Reproduce it: `node tools/course-optimization/measure-mapping-derivation.cjs`
(read-only; `GEN=<path>` scores a different derivation). Raw output for both runs
is in `estate-before.json` / `estate-after.json` next to this file.

### What was wrong

The old rule claimed target columns **sequentially** — the first component took
the first N columns, the second took the next N, and so on. That silently assumes
the components are stored in the *target's* word order. Estate-wide they very
often are not: they are stored in the **known language's** order.

`eng_for_pan S0019L02`, target **don't want to stop talking**, components listed
as `[talking, stop, don't want to]`. Sequentially that put the gloss for
*talking* under "don't", *stop* under "want", and *don't want to* across "to stop
talking". Every single gloss on the row landed on the wrong word.

### What it does now

Each component is **located** by its own target text and claims the columns that
actually read as its words, wherever they are. Longest first, so a one-word
component cannot take a column out of the middle of a longer one. Placed that
way a gloss is correct by construction — the columns under it *are* its target
words. The same row now opens:

```
don't  want  to  │ stop │ talking
ਨਹੀਂ ਕਰਨਾ ਚਾਹੁੰਦਾ  │  ਬੰਦ  │ ਗੱਲਾਂ ਕਰਨੀਆਂ
```

### What did NOT change: the refusal to guess

The blank column barely moves, and that is deliberate. Locating uses only what a
component already says. A component whose target does not occur in the row's own
target text is **not** invented into place — it falls back to the leftover
columns exactly where the old rule put it, so `eus_for_eng gogoratzen saiatzen
ari naiz` still derives from its components' glosses. A row with nothing to
derive still opens **blank** for a human to author (7892dce5), and nothing
anywhere fabricates a gloss.

The 7 rows that left the blank bucket are rows whose later components the old
code silently dropped when one overflowed the column count.

---

## The repair gesture

Tom, 19:19Z: *"I need to be able to position any item in the known language
underneath any item in the target language … we need to be able to move any known
tile to match any target tile and change the order of the known words as well —
but never the target words of course."*

What shipped on 12 August was a **segmentation** gesture: split a chunk, merge two
neighbours, nudge one gloss word across one break. All three are relative to
where a word already is, so a word could only travel one break at a time and
could never be reordered against its own neighbours. That is what "not brilliant"
meant.

Now every known word is its own **tile**:

- **tap a tile** — it lifts, and every place it could go opens as a landing slot:
  before or after any word, in **any** chunk, including the empty ones
- **tap a slot** — it lands there and the row saves
- **tap the tile again** — it goes back down, nothing happens

Drag does the same for anyone on a mouse. **Nothing needs a drag** — Deborah works
on a tablet, so tap is the whole gesture and every control is visible at rest,
never revealed on hover.

Split and merge stay: they change the column **spans**, which free placement does
not. The two nudge arrows are gone — a tap now takes a tile anywhere, so an arrow
that moves it across one break says strictly less.

### The half that is a hard no

*"but never the target words of course."* That is structural rather than policed.
The rule lives in `src/utils/glossPlacement.ts`, pure and unit-tested, and it
copies the spans through untouched — so the target columns cannot move, merge or
reorder, and the target row is not addressable by any gesture at all.

It also takes no word in and lets none out: the words after a move are the words
before it, as a multiset. So the API's re-pairing gate passes **by construction**
rather than by luck, and no untranslated text can be smuggled in. **The API
needed no relaxation at all** — its multiset check was already order-independent,
which is why free placement fits through it unchanged.

---

## Display-only, and nothing near the audio — verified, not assumed

Tom's worked example is the load-bearing part: the audio says *"the Spanish for
'blue thing' is: 'cosa azul'"* while the text that shows is `cosa | azul` over
`thing | blue`. The displayed gloss is decoupled from the known-language
introduction and does not have to be the same string.

Verified on the live endpoint, not asserted:

- the whole write path is **one** statement — `.update({ known_gloss_segments })`
  — and there is no second one;
- after a real save, `known_text`, `target_text` and `components` on that row read
  byte-identical to before;
- no audio pass is queued, no clip is marked stale, `courses.audio_stamp` for the
  course is untouched (still 2026-08-06), and nothing in the path can reach a
  re-translate or a TTS render.

---

## Driven end to end on a real row

`eng_for_pan S0019L02`, against the real database through the real endpoint with
a real editor token:

1. **Derived open** — `[3: ਨਹੀਂ ਕਰਨਾ ਚਾਹੁੰਦਾ] [1: ਬੰਦ] [1: ਗੱਲਾਂ ਕਰਨੀਆਂ]` — correct, where
   today's code opens it fully crossed.
2. **Two gestures the old tool could not make** — a tile moved from the first
   chunk to the third, *past* a chunk in between; and two words reordered inside
   one chunk.
3. **Saved** — HTTP 200, `application/json`, body echoing the segments.
4. **Read back from the database directly** — holds exactly what was sent:
   `[{"span":3,"known":"ਚਾਹੁੰਦਾ ਕਰਨਾ"},{"span":1,"known":"ਬੰਦ"},{"span":1,"known":"ਗੱਲਾਂ ਨਹੀਂ ਕਰਨੀਆਂ"}]`
5. **Reverted** — `segments: null` → the column goes back to `NULL`, and the
   response carries the newly-derived alignment, so the row shows the truth at
   once.

Tests: **83 green** — 73 in `learning-script-generator.test.cjs` (6 new, none
flipped) and 10 new in `glossPlacement.test.ts`. `vue-tsc` and `vite build`
clean. GitHub Actions is off estate-wide, so local runs are the whole
verification path.

---

## Deployed, and checked where it is served

- **API** — merged to `main`, the production checkout pulled, and
  `popty-production-api.service` restarted. Asked live on the restarted service,
  `eng_for_pan S0019L02` now comes back derived as
  `[3: ਨਹੀਂ ਕਰਨਾ ਚਾਹੁੰਦਾ] [1: ਬੰਦ] [1: ਗੱਲਾਂ ਕਰਨੀਆਂ]` — correct, where before the restart it
  answered fully crossed.
- **Frontend** — Vercel rebuilt `popty.app` from `main`. Checked on the bytes
  actually served, not asserted: chunk `assets/ScriptViewer-DLBYZFhJ.js` carries
  `mapping-tile`, `mapping-tile-picked`, `mapping-slot` and "Put the tile here",
  no longer carries `mapping-nudge`, and still carries "back to the original".

---

## Taste-safe defaults — overrule any of these cheaply

1. **The multiset gate is kept.** An author may rearrange and re-place the words
   the row already has, but may not type a new one or delete one. Tom asked for
   placement and ordering freedom, not free typing, and this gate is what
   guarantees no untranslated text gets in. Nothing in the new gesture needed it
   relaxed.
2. **The nudge arrows were removed**, not left alongside. Free placement does
   strictly more, and two dead controls in a 1.5rem strip cost clarity.
3. **A column with no gloss gets one empty chunk each**, rather than one wide
   empty chunk, so every bare target word can receive a tile of its own.
4. **An unlocatable component keeps its gloss** on the leftover columns rather
   than having it dropped — a wrong-ish starting place an author can fix beats a
   word that vanished off the row.
5. **Candidacy is untouched** — intro rows only, and a declared M-LEGO with two or
   more target words is still a candidate that opens blank. This job changed
   *how* an author places tiles, not *which* rows offer the tool.

## Gaps, stated plainly

- The **2,364 rows that still open wrong** are mostly components that are not
  contiguous in their own target text (`has been very upsetting` glossed as
  `[very, has been upsetting]` — "has been upsetting" is split around "very", and
  a span model cannot express a discontiguous chunk). Those are exactly what the
  repair gesture is for. Making the model discontiguous would be a storage
  change; it is not obviously worth it for 6% of rows and is not proposed here.
- The end-to-end drive was through the **API**, against the real database, from
  the branch's own code. A browser screenshot of the tiles being tapped is not in
  this document.
