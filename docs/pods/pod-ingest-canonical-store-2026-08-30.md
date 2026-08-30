# The three new pods are in the store — and the coverage question has an answer

*2026-08-30. Branch `feat/pod-ingest-canonical-store`, merged to `main`.*

---

## The headline

All three pods written last night are now rows in `canonical_pod_scenarios`, editable in the
Script Lab at `/canonical/scripts`, and scored by the coverage read-out. **The markdown is no
longer canon.** A line edited in the lab changes the database, and there is no sync that could
ever overwrite it.

And the question the instrument was built for now has a number:

| | shapes traversed | **N13 · N14 · N15 · N16 · N17** | outcome shapes delivered |
|---|---|---|---|
| `pod-0` — the live POD 1 | 18/23 | **never · never · never · never · never** | 0 of 9 |
| The Learning flagship | 7/23 | **once · twice · once · once · twice** | **3** of 9 |
| The Method Pod, chapter cut | 9/23 | **once · twice · once · once · twice** | **6** of 9 |
| The Method Pod, 43-scene control arm | 9/23 | **once · twice · twice · once · twice** | **8** of 9 |

**Yes — the Method Pod delivers N13–N17, and so does the Learning flagship.** All five of the
shapes POD-1 can never reach are walked by all three new pods. That was the open question and it
is answered.

The two arms then separate on the **outcome overlay**, which is where the difference between the
forms actually shows: the 43-scene control arm delivers **8 of 9** outcome shapes, the chapter cut
**6 of 9**, the Learning flagship **3 of 9**. The chapter cut loses O6 (trouble that is your own
fault), O7 (worry disclosed) and O9 (a second no) relative to the control arm — the three the
control arm carries in scenes 39, 36 and 18. The Learning flagship carries O1, O2 and O8 only,
and its own §15 says exactly that and why: "minting one here would be decoration."

The low shape-traversal counts (7–9 of 23) are not a defect in the pods. Fourteen of the
twenty-three are the transactional and bound-pair ground — N2–N5, N9–N12, P1–P6 — which none of
these three pods is about, and each document says so in its own coverage section. What the new
pods reach is precisely the summit ground POD-1 cannot.

---

## What landed

| pod | slug | lines | units | walk steps |
|---|---|---|---|---|
| The Learning flagship | `learning-flagship` | **367** | 11 chapters | 72 |
| The Method Pod, chapter cut | `method-pod-chapters` | **309** | 12 chapters | 75 |
| The Method Pod, 43-scene cut — the control arm | `method-pod-43-scene` | **276** | 43 scenes | 77 |

Those line counts are read back from the database after the write, not from what the script
intended. They also match each document's OWN measured turn totals — the Learning flagship's
§12a sums to 367, the chapter cut's §4b says 309, the control arm's §5b says 276 — which were
computed independently of this code. That agreement is the importer's strongest check and it is
what `tools/pods/parse-pod-markdown.test.cjs` asserts.

Slugs are the taste-safe defaults from the brief: `learning-flagship`, `method-pod-chapters`,
`method-pod-43-scene`. Each carries a one-line note in the lab's index. `pod-0`, `pod-1` and
`pod-0.5` were not touched and nothing was renumbered.

---

## Mapped, unresolved, out of scope — per pod, honestly

Two different numbers matter and they are reported separately, because conflating them is how a
coverage read-out starts lying.

**Lines** — how much of each pod the graph has something to say about:

| pod | lines | mapped to a shape | UNMAPPED | codas / alternatives |
|---|---|---|---|---|
| `learning-flagship` | 367 | 237 | **130** | 0 / 0 |
| `method-pod-chapters` | 309 | 215 | **94** | 0 / 0 |
| `method-pod-43-scene` | 276 | 106 | **170** | 0 / 0 |

A line is UNMAPPED when its chapter declares no shape that resolves against the store. It does
not mean the line is wrong. The 43-scene arm has the most because it is cut finest: many scenes
declare their shape only by phrase, and a phrase with no store id resolves to nothing.

**Shape declarations** — every shape the pods name, and whether the store has an id for it:

| pod | declared | resolved | UNRESOLVED | of which |
|---|---|---|---|---|
| `learning-flagship` | 72 | 16 | **56** | 44 `m`-register · 10 summit shapes · 2 named |
| `method-pod-chapters` | 75 | 23 | **52** | 37 `m`-register · 8 summit shapes · 7 named |
| `method-pod-43-scene` | 77 | 31 | **46** | 6 `m`-register · 9 summit shapes · 31 named |

**Why so many are unresolved, and why none of them were guessed:**

1. **The `m1`–`m23` register is not the store's register.** The pods number the corpus moves the
   way the 2026-08-29 response-family inventory did. The store's move register is `F1`–`F21`
   (twenty moves, no F20), and it holds no crosswalk to the `m` numbers. Mapping `m7` to `F16`
   because both are about concession would fabricate coverage. Every `m` token is recorded
   UNRESOLVED with its reason on the row. **This is the single biggest source of unresolved
   declarations and it is a store gap, not a pod defect** — see the decision at the end.
2. **The eight summit shapes have no id by construction.** The control arm's §1e says they are
   shapes "on the page, general, and walked by nobody" that "no inventory named". Aliasing them
   would invent the very thing the documents say does not exist yet.
3. **31 named-shape declarations in the 43-scene arm** are scene headings and `Shape witnessed:`
   names — "joint construction", "the flagged guess", "the metaphor handover" — which are `m`-register
   moves under their phrase names. Same reason, same treatment.

Where a phrase IS a store shape's own name, it is aliased — declared in the open in
`tools/pods/pod-shape-aliases.cjs`, nine entries, each with its reason on the row, exactly the way
`src/lib/metagraph/parseMethodPod.js` declares its own. 16 declarations across the three pods
resolve by alias; the rest resolve by explicit id (`N13`, `O5`) written in the documents themselves.

---

## Where it is stored, and why

**Dialogue → `canonical_pod_scenarios`**, one row per turn, the existing table, the existing
`PATCH /api/admin/canonical-pods/:id` edit path. `scene_number` carries the chapter or scene
number, `global_order` the pod's own line sequence.

**Two new nullable columns on that table: `target_text`, `target_lang`.** Both Method Pod cuts are
written English beside Italian. `author_notes` is a live editable field with its own purpose, and
a second scenarios table would be a second copy of the dialogue — so the Italian gets two columns.
They are null on `pod-0`, `pod-1` and `pod-0.5`, and the existing read path is unchanged.

**A new companion table: `canonical_pod_walk_steps`.** This is the one genuinely new object, and
here is why it was needed. A walk is a sequence of node references (`src/lib/metagraph/walk.js`,
Watson's ruling of 2026-08-30) — text hangs off the node reference, never the reverse. But these
pods declare their shapes **at chapter level**, not per turn. Putting a shape id on a dialogue row
would invent a per-turn claim the documents never make. So the walk lives beside the dialogue: one
row per declared shape traversal, carrying `node_id` (null when unresolved), the verbatim
`declared_as`, its `register`, its `resolution`, and `scenario_id` pointing at the row it hangs off.
No dialogue text is duplicated anywhere.

The DDL, verbatim, is in `tools/pods/ingest-canonical-pods.cjs` (`--ddl` prints it) and was applied
to the live database.

---

## It round-trips, and it cannot be silently overwritten

**The round trip, proven:** line `learning-flagship:SC01-S02` read `"Of four."`; a `PATCH` through
`/api/admin/canonical-pods/:id` — the lab's own edit endpoint — set it to
`"Of four. — round-trip probe 2026-08-30"`; read back **straight from the database**, not from the
API, it was changed, with `updated_at` moved from 19:35:30 to 19:38:05. The lab then rendered the
edited line. It was reverted to `"Of four."` through the same endpoint afterwards, and the revert
was verified the same way.

**No implicit sync exists.** The importer has no startup check, no file-versus-DB comparison and no
"fix". Run it a second time against a live slug and it refuses:

```
REFUSED: 367 rows already live under 'learning-flagship'. The DB is canon; a re-import
would overwrite edits made in the Script Lab. Pass --reimport-destructive to destroy them.
```

`--reimport-destructive` is the only way back, it requires `--execute` as well, and it prints the
row count it is about to delete before deleting it.

---

## Verification, and the one thing I could not do

- `node tools/pods/parse-pod-markdown.test.cjs` — 39 checks, all pass, including the three
  document-derived turn totals and the assertions that no walk step carries text and no `m` token
  ever resolves.
- `node tools/metagraph-selfcheck.cjs` — 345 checks, 0 failed. The store still reproduces every
  count in `shape-graph-2026-08-30.md`, and nothing in `services/shared/metagraph/` was written.
- `node tools/metagraph/coverage-test.js` — 17 checks, all pass. The markdown-parsed `method-pod`
  entry still parses and covers exactly as before.
- No full vitest/playwright fleet was run: this job touches four source files and a table, and a
  fleet would test thousands of things it never goes near.

**EXPLICIT GAP — no screenshot.** This box cannot launch a browser: every Playwright Chromium build
in the cache fails with `libnspr4.so: cannot open shared object file`, there is no system Chrome,
and there is no passwordless sudo to install the library. So instead of a PNG I built the honest
equivalent — `tools/pods/render-script-lab-readout.mjs`, which fetches from the **same endpoint the
page fetches** and runs the **same modules the page runs** (`fromStore.js`, `walk.js`,
`coverage.js`), then prints the strings the template puts on screen. Its output for all four pods,
including one chapter of each rendered with the Italian beside the English, is committed at
`docs/pods/evidence/script-lab-readout-2026-08-30.txt`. It is closer to the data than a screenshot
would have been, but it is not a screenshot, and I am not claiming I saw the page in a browser.

A dev API instance ran on **port 3491** and a Vite dev server on **port 5199** for this. Both are
stopped. The live 3470 API process was never touched — **it needs a restart to serve the new
`walk` field**, which is the one thing standing between this work and Tom seeing it on popty.app.

**The pod-migration protocol does not apply, and I checked rather than assumed.** I queried every
table in the database carrying a `pod_slug` or `pod_id` column: only `listening_pod_sentences` is a
generated-pod table, and it holds **0 rows** under the three new slugs. No generated pods, no
learners, no progress filed under any slot. `docs/pods/pod-migration-protocol.md` governs editing a
LIVE pod; these are brand-new slugs.

**No TTS, no audio, no audio-pass queue.** Not a clip, not a plan for one.

---

## Needs Tom — three, each answerable in one word

1. **Retire the markdown-parsed `method-pod` entry in the lab, now that the scenes are in the
   store? RECOMMENDATION: yes.** It reads sixteen ratified scenes at runtime out of
   `method-pod-re-cut-2026-08-30.md`, and those same sixteen are now scenes 1–16 of
   `method-pod-43-scene` in the database. Two copies of overlapping material that can drift is the
   thing you just ruled against. I left it working exactly as it was, because the commission said
   not to change existing lab behaviour — retiring it is one line in `loadGraph.js` and one block
   in `ScriptLabView.vue` whenever you say the word.

2. **Should the store gain a crosswalk from the `m1`–`m23` corpus-move register to `F1`–`F21`?
   RECOMMENDATION: yes.** It is the largest single cause of unresolved declarations — 87 of the
   154 across all three pods — and it is a store gap rather than anything wrong with the pods. It
   is a store change, so it is not mine to make: `services/shared/metagraph/` is byte-identical by
   ruling and I wrote nothing into it.

3. **Are the slugs right?** I took the brief's taste-safe defaults: `learning-flagship`,
   `method-pod-chapters`, `method-pod-43-scene`. Renaming later is a one-line update in three
   places plus an `UPDATE` on two tables.

---

## In one paragraph

Three pods, 952 lines and 224 walk steps, are in the canonical store and editable in the Script
Lab; the walk is stored as node references in a companion table because a chapter declares its
shapes at chapter level; every shape the pods name that the store has no id for is counted as
UNRESOLVED rather than guessed, and there are 154 of them, 87 of which are one missing crosswalk;
the import refuses to run twice; the round trip is proven in both directions; POD-1 is untouched
and still reads 18 of 23 with N13–N17 never reached; and all three new pods walk all five of the
shapes POD-1 cannot, which is the answer the instrument was built to give.
