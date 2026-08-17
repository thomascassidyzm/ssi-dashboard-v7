# The blast radius check for content edits

**Status:** read-only reporter BUILT and pushed (branch `feat/edit-impact-check-2026-08-17`). Write-path changes DESIGNED and COSTED, held for Kai's yes.
**Commissioned by:** Kai, 2026-08-17 — *"seed text edits ... can affect the legos and the phrases and all phrases that use something from the seed all over the course. And therefore all of that audio (including the presentations of any affected legos). ... I think this is a general problem. Any changes like these need to trigger a check of the effects."*

---

## Who calls it (Kai's ruling, 2026-08-17)

> *"it's probably better to just get the original agent to do that (or to launch one when they have a proposed change ready). The results might affect the original decision, so it's good to loop the original agent back in."*

**There is no guardian and no watcher process.** The check is a function the proposing agent calls on itself, before applying:

```
agent has a change ready
    → agent runs the check itself, pre-apply
    → agent reads `decision` and decides
    → the result may CHANGE OR CANCEL the original proposal
```

That is a real design constraint, not a note about deployment, and it is what the output is now shaped around. A monitor only needs to be *right*; a report the proposer acts on has to be **decidable** — it must say, in one field, whether the proposal should go ahead as written, and if so what else the agent has to do. So every report opens with a `decision` block:

| verdict | meaning | exit |
|---|---|---|
| `proceed` | nothing beyond the edited row is affected — apply as written | 0 |
| `proceed-with-repairs` | safe to apply, but **not finished when the text lands** — carry out `required_actions` | 10 |
| `reconsider` | the edit as written damages work beyond itself — revise, narrow, or accept the cost deliberately, then re-run | 20 |

Exit code `2` is reserved for the tool itself failing, so "the check broke" is never mistaken for "the check found nothing". `decision` is **advice to the proposing agent — it blocks nothing, by design**, which is the same reason the blocking gate below stays unbuilt.

What earns a `reconsider` is deliberately narrow: it is the set of outcomes that should make an agent rethink rather than just do more work afterwards — phrases breaking elsewhere in the course, a LEGO's own phrases losing containment, a seed needing re-decomposition, a **silent voice swap**, and an edit placing vocabulary at a position where the course hasn't taught it yet. That last one distinguishes debt the edit *inherits* (reported, not blocking) from a rail the edit *breaks* (`untaught_at_this_position`).

Three call shapes, all pre-apply:

```bash
# 1. inline, one edit — ~15s, cheap enough to just run
node tools/edit-impact-check.cjs --course eng_for_sin --seed 181 --known "…"

# 2. pipe the pending proposal in, read the decision out
echo "$PROPOSED" | node tools/edit-impact-check.cjs --course eng_for_sin \
    --plan - --json - --quiet | jq -r '.decision.verdict, .decision.required_actions[]'

# 3. in-process, no CLI — safe to require, nothing runs on load
const { checkEdits } = require('./tools/edit-impact-check.cjs')
const r = await checkEdits('eng_for_sin', [{ seed: 181, known: '…' }])
```

`--plan -` reads stdin so an agent never has to invent a temp file — `/tmp` is shared between dispatched workers and a scratch file there has been silently overwritten by a parallel slice before. Run it yourself rather than dispatching a worker unless the batch is large; at ~15s per edit the dispatch costs more than the check.

---

## What the existing edit-cascade already does, gets wrong, and never sees

There is real prior art. `services/course-builder/routes/edit-cascade.cjs` (spec: `docs/specs/edit-cascade-spec.md`, marked IMPLEMENTED 2026-06-21) has a `dryRun` mode, and the part of it that works is the important part: it discriminates a **vocab-preserving (Case 1)** edit from a **vocab-changing (Case 2)** one by set-diffing the seed's LEGO+component contribution, and it gets the downstream tiling failures *exactly* by replaying `/v2/validate` with a non-mutating in-memory `override`. That reasoning is correct and this work **reuses it rather than replacing it** — the new tool walks the same tile-then-add loop and calls the same `checkVocabViolations` DP chunk-tiler.

What it gets wrong, verified against the code and the live database rather than against its own spec:

- **It has no knowledge of `course_audio` whatsoever.** Its `estimateAudio()` is arithmetic — `phrases × 3 + legos` — not a query. It cannot say which clip goes silent, which clip gets silently re-pointed, or to which voice. Kai named audio and presentations explicitly, so this is the centre of the ask, not an edge.
- **It only accepts a target-side seed edit, and it requires a ready `legos` breakdown as input** (`if (!Array.isArray(legos) || legos.length === 0) → 400`). The three eng_for_sin repairs applied today were **known-side** edits — `eng_for_sin` has Sinhala on the known side — so this endpoint would have rejected all three outright.
- **It is reachable only over HTTP from a running course-builder.** The edits that caused today's damage were direct database writes by a worker (job #850). Nothing in that path can call it.

What it never sees at all: the seed trigger gap; the relink-to-a-different-voice hazard; presentation clips as objects rather than as a count; the `unique_course_audio_per_voice` collision; taught-late/used-early ordering; and the pod-migration and make-before-break doctrine gates.

**Conclusion: it is the right foundation for the tiling half and no foundation at all for the audio half.** The new tool is a superset that reuses the validation library directly, in-process, so it works with no service running.

---

## The four gaps, as verified on 2026-08-17 against live `pg_trigger` / `pg_proc`

**Gap 1 — a seed text edit is silent.** `course_seeds` carries exactly three triggers: `course_seeds_audit`, `course_seeds_touch_content_stamp`, `course_seeds_version_trigger`. There is no `null_seed_audio_on_text_change`. The nulling triggers exist on `course_legos` and `course_practice_phrases` only. So on a seed the link is left **untouched**, still pointing at the clip for the old text. No NULL, no orphan, nothing for a missing-audio sweep to find, and `audio_autolink` cannot rescue it because `link_audio_to_content()` only fills links that are already `IS NULL`. The learner keeps hearing the sentence you thought you fixed.

**Gap 2 — where the trigger *does* fire, that is also a hazard.** Read the trigger body: it does not null, it **re-points**.

```sql
NEW.target1_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target1');
```

and `audio_id_for_text` matches on `text_normalized`, which is `rtrim(lower(trim(t)), '.?!¿¡。？！')` — trailing punctuation stripped — ordering `(origin='human') DESC, created_at DESC`. So the outcome is one of two silent ones: **NULL** (a silent slot) or **an existing clip that may be in a different, possibly retired, voice**. The check must predict both directions, and it does — by calling that same `STABLE` function read-only, so the prediction is not a model of the trigger, it *is* the trigger's own arithmetic.

**Gap 3 — the entry point that caused the damage bypasses the cascade.** Hence a CLI, usable by a worker about to run a direct SQL edit, not a dashboard modal.

**Gap 4 — the pattern generalises past the edited rows.** `හැබැයි` is taught as a LEGO only at seed 469 yet used by seven earlier seeds. That is "all phrases that use something from the seed all over the course". The tool runs a taught-late/used-early check on whichever side was edited, tokenising script-agnostically — deliberately unlike the known-side gate's `tokenizeKnown`, which splits on an ASCII-only class and is therefore inert for 31 courses.

---

## What the tool reports

`tools/edit-impact-check.cjs`. Read-only — the DB session sets `default_transaction_read_only = on`, so that is enforced by Postgres, not promised by a comment. It renders no audio and makes no LLM calls.

Per edit, against seeds, LEGOs or phrases, in any course:

1. **The edited row** — old text, new text, which columns, and which trigger will fire, read live from `pg_trigger` at run time rather than trusted from this document.
2. **Every audio link, predicted exactly** — current clip (id, voice, origin, whether the S3 object exists, what it actually says) against the predicted post-edit clip, classified `unchanged` / `relinked` / `nulled-silent` / `left-stale`, with a **voice-change** flag. For `left-stale` it names the clip the link *should* point at, so the warning is a one-line repair.
3. **The `unique_course_audio_per_voice` collision** — every clip already holding the new text in that role and voice. This is the failure that broke row 1 of today's 27-clip swap *after* its dry run reported 27/27; predicting it is the difference between a dry run and a photograph.
4. **Derived rows** — for a seed, its LEGOs and phrases plus the Case 1 / Case 2 verdict; for a LEGO, whether its own build/use phrases still contain it.
5. **Course-wide** — every phrase anywhere that stops tiling once the edit removes a chunk, re-tiled through the builder's own DP chunk-tiler; taught-late/used-early; and every other row in the course carrying the identical old text (they share the clip).
6. **Presentations** — every intro clip that embeds the old text on either side, plus the row's own intro clip. It reports the clips and does not invent the replacement wording: presentation text is composed at render time and is course- and language-specific.
7. **Doctrine flags** — pod-content migration (`docs/pods/pod-migration-protocol.md`, plate A-111), make-before-break (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b), `content_stamp` cache invalidation, and whether learners can reach the course at all.
8. **A TTS volume estimate.** Never a render.

Output is a human rendering plus `--json <path>`. Exit code 1 when anything is `danger`, so it can gate a script.

```bash
node tools/edit-impact-check.cjs --course eng_for_sin --seed 181 --known "…"
node tools/edit-impact-check.cjs --course cym_for_eng --lego 42:3 --target "…"
node tools/edit-impact-check.cjs --course eng_for_sin --plan my-edits.json --json report.json
node tools/edit-impact-check.cjs --course eng_for_sin --replay-since 2026-08-17
```

## Proving it against reality

A dry run that does not rehearse the write is a photograph. So the tool has a `--replay-since` mode that reconstructs edits that **already happened** from `content_audit_log` — which keeps the whole OLD row — and asks what the check would have said *before* they were applied.

Replayed against today's applied eng_for_sin repairs (126 text edits since 2026-08-17, 53 seconds, zero rows written):

- **32 × `STALE LINK`** on `course_seeds` — the tool independently rediscovers Gap 1, naming the clip and quoting the old text it still speaks. On seed 181 it also names the correct replacement clip `b278ab82…`, which is exactly the link the worker went on to repoint by hand, mid-flight, having had to discover the trigger gap for itself.
- **21 × `SILENT RE-POINT`** and **73 × `SILENT SLOT`** on legos and phrases — Gap 2, both directions.
- **25 × `PRESENTATIONS STALE`**, listing the intro clips by id.
- **70 × `TAUGHT LATE, USED EARLY`** — Gap 4, generalised. Example from the replay: the Sinhala `වෙනවා` is taught at seed 80 but used 293 times from seed 47.
- **0 phrases broken course-wide** — correct and worth stating plainly: every one of today's edits was on the known side, which cannot remove a target-side chunk. A tool that reported breakage here would be wrong.

And against a synthetic target-side LEGO edit — `eng_for_sin` lego 1:3, `"to speak"` → `"to talk"` — it reports **304 phrases across the course** breaking out of 10,506 re-tiled, 3 containment failures on the LEGO's own phrases, both target roles silently re-pointing to existing clips, the presentation nulled, 34 stale intro clips, and the unique-constraint collision on both target roles. That single-word edit is precisely Kai's sentence, measured.

Seven unit tests cover the pure half (`node --test tools/edit-impact-check.test.cjs`), including that non-Latin scripts tokenise correctly rather than to nothing.

Cost: ~53s for a 300-seed course, ~15s per single edit, all of it database reads. A single course probe was run, not an estate sweep. An estate-wide pass over all 117 courses would be roughly 1–2 hours of read traffic and is not needed for anything proposed here.

---

## What is NOT built, and what it would take

Held deliberately — none of it ships without Kai's yes, because all of it changes the write path.

| Proposal | What it is | Cost | Risk |
|---|---|---|---|
| **A. `trg_null_seed_audio_on_text_change`** | Give `course_seeds` the same relink trigger the other two tables already have, so Gap 1 stops being silent. One migration, ~15 lines, mirrors an existing function. | half a day | DDL on a live table; converts a *silent* failure into a *visible* one (a NULL slot), which is strictly better but will surface a backlog of missing audio that has been hiding |
| **B. Return the `decision` block from `POST /api/seed/complete` and the dashboard save** | The submitting agent/editor gets its own blast radius back **in the response to its own submission** — the same loop-back shape as the CLI, on the API path. Advisory, never blocking. | 1 day | none to content; the endpoint gets slower by ~1s |
| **C. A blocking gate** | The submission is *refused* when the decision is `reconsider`. | 1 day | real — it can stop legitimate work, and the estate has parallel campaigns that would trip it |
| **D. Extend `edit-cascade.cjs`'s dry run to call this** | Fold the audio half into the existing modal, so a dashboard editor gets the same decision block a worker gets. | 1 day | touches mutating code |

My recommendation is **A + B**: fix the silent failure, and make the decision come back to whoever proposed the edit on the path most edits take, without ever refusing a submission.

C is the one to leave alone, and Kai's ruling is the reason as much as the practicality is. Looping the proposing agent back in works because the agent still owns the decision — it can weigh the blast radius against what it knows about *why* the edit was wanted, and decide to proceed anyway. A gate that refuses takes that judgement away from the only party holding both halves of it, and gets switched off in a hurry at 2am and then stays off.

---

## The rails this obeys

Read-only against course data. No TTS. No Anthropic SDK. No writes to `course_seeds`, `course_legos`, `course_practice_phrases` or `course_audio`. No S3 mutation. No deletions. Nothing merged to `main`.

**Out of scope, stated rather than worked around:** the `course-configs` repo is outside this workspace, so any legacy-app consequence of an edit is unexamined here.

The learner-side read path is in scope and was checked rather than assumed: `packages/player-vue/src/composables/useScriptCache.ts` has a `content_stamp` lane in `checkContentVersion`, covered by `useScriptCache.contentStamp.test.ts`, and `courses.content_stamp` is moved by the `touch_course_content_stamp` trigger that all three content tables carry (verified live). One nuance the tool states and this doc should too: that lane is **stale-while-revalidate**, so a learner mid-session can hear the old content once before the refresh lands. The stamp bump bounds how long the damage lasts; it does not prevent it. The tool reports the stamp bump and what follows from it — it does not query the learning app.
