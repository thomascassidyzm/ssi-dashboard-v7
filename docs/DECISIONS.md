# Decisions journal

One entry per decision that a later reader would otherwise have to reverse-engineer
from the code. Newest first.

---

## 2026-09-01 — the live canonical slate is pod-1: the first rung of the compulsory default chain

**Decision.** `canonical_pod_scenarios`'s live slate, 231 rows in 22 scenes, was renamed
`pod-0` → `pod-1`. The two sacked pre-metagraph slates that held the names `pod-1` (236
rows) and `pod-0.5` (27 rows) were archived and deleted to free the name. Order forced:
delete, then rename, one transaction, row counts asserted per step. Nothing learner-facing
was touched — `listening_pods` is a separate per-course migration, 22 of 68 done, and its
counts are identical before and after (46 on `pod-0`, 22 on `pod-1`, 269 and 594
`learner_pod_state` rows).

**Why the number.** Numbering was retired as a CONTENT label — a walk is named by what it
masks, and Health is Health, not pod-4 — but numbers name the **compulsory default chain**
(Tom, 2026-09-01): pod-1, pod-2, pod-3 is the ladder a learner descends by *not choosing*.
This slate was always the first rung; it had never been named as one.

**Why it can't be reverse-engineered.** Once the rename lands there is no `pod-0` row left
in the database to check any old claim against, and ~200 documents still say `pod-0` is the
live pod. Nine that carried it as a standing warning now open with a dated banner;
`docs/pods/canonical-pod-slug-migration-2026-09-01.md` is the note they point at.

**One thing that was NOT a rename.** `syllableCeiling` was `podSlug === 'pod-0' ? 8 : 12` —
a pedagogical difficulty tier read off a name. Tom ruled: decouple it, do not just rename
the string. The tier is declared per slate in `services/shared/pod-tiers.cjs` with the rung
it sits on, and is read from the canonical slug, not the per-course listening slug. That
also fixed a live bug: the 22 already-flipped courses were getting the harder 12-syllable
ceiling for the same beginner content their siblings get at 8.

**One thing deliberately NOT deleted.** `canonical_script_versions`'s six `pod-0.5` rows.
The audit said "no FK dependents", which is true — but the absence of that FK is the
feature keeping the history alive, not evidence the rows are safe to bin. Its migration,
written the day before (`20260831_canonical_script_versions.sql`), enforces append-only with
a trigger and says "history must survive a line being re-ingested or removed, which is
exactly when someone wants to read it." Deleting them meant disabling a one-day-old guard
built to prevent that exact deletion. They are archived and still live; open for Tom.

**Decided by:** agent, under Tom's 2026-09-01 migration brief and his ruling on the
compulsory default chain; the append-only carve-out is the agent's call and is flagged.
## 2026-09-01 — a corpus that exists is ingestable without editing code; the walk registry replaces the hardcoded map

**Decision.** `tools/pods/ingest-canonical-pods.cjs` carried a hardcoded three-entry `PODS`
map, so the Script Lab showed three walks and had never shown a fourth. The map is gone,
replaced by `tools/pods/pod-corpora.json` — the walk registry. One file, two readers: the
ingest tool discovers what to ingest, and the Script Lab reads the labels a human needs to
tell walks apart. Adding a walk is one JSON entry plus its corpus file.

A second parser, `tools/pods/parse-sector-walk.cjs`, reads the themed-walk format
(`## scene` / `### Flow N` / `- **W:** "line"`), which the existing pod-table parser cannot
see. A flow becomes a `variant_key`, which is what that column already existed for. Nine
walks are now in `canonical_pod_scenarios`, up from four: health 438, trades 414, retail 330,
hospitality 330, care-work 306.

**Why it can't be reverse-engineered.** The claim was tested rather than asserted. The
care-work corpus landed mid-job; promoting it from mapping-only to ingested took editing
three fields and copying one file, with no code change anywhere. That is the whole
justification for the registry, and it is recorded in the entry's own `note`.

Two rulings sit inside it that a later reader would otherwise re-litigate:

*A mapping is not a walk.* Five proposals under `services/shared/metagraph/proposed/` record
`"corpus": "NONE"`. They are `status: mapping-only` and are skipped by the tool with a
different sentence from a refusal — "skipped: no corpus" and "refused: rows already live"
are different facts and are never the same row.

*No shape claims is not zero coverage.* health, hospitality and care-work declare no
metagraph shapes, so no walk steps were parsed and none were invented. Their coverage reads
as words, not numbers. Rendering that identically to a walk that declared shapes and failed
to resolve them would libel the exemplar corpus.

**Better:** a corpus that exists can be seen, which is the thing that was actually broken.
**Simpler:** one predicate — `status === 'authored' && corpus && format`, hoisted into the
registry as `ingestableRule` and cited by both readers rather than implemented twice.
**Cheaper (total):** the marginal cost of walk ten is one JSON entry, and there is no second
copy of the walk list to drift.

---

## 2026-09-01 — the Script Lab is LIVE AT NEXT GENERATION, and the evidence for LIVE NOW belongs to Pod Lab

**Decision.** The brief for this job said to give the Script Lab a LIVE NOW banner. It wears
LIVE AT NEXT GENERATION instead, naming `POST /api/canonical-script` as the control.

**Why it can't be reverse-engineered.** The instruction cited job #714's finding that
"a seam or gloss saved in the fine-map editor is read by the next learner" — but that is
**Pod Lab's** fine-map editor (`PATCH /api/pod-fine-map` → `atom_map_fine`, read live at
`useListeningPods.ts:179`), and #714 classified Pod Lab live on exactly that basis. The
Script Lab's only write is `POST /api/canonical-script`, which updates
`canonical_pod_scenarios`. Nothing learner-facing reads that table:
`services/pod-dialogue-generator.cjs` flexes it into `listening_pod_sentences`, and only when
explicitly invoked — verified that no scheduler triggers it.

#714's own rule is *classify by what the code writes, and a lab's tier is its
highest-reaching control*. Applying it faithfully gives deferred. Labelling the most deferred
write in the estate LIVE NOW would be the same class of lie that rule exists to prevent: a
label pitched wrong teaches people to disbelieve the axis.

This is the same distinction as the canonical seed versus a course's known text, re-measured
non-circularly on 2026-09-01: at the slot whose canonical line is "Good morning, Sarah!",
the generated pods hold **24 distinct `known_text` values across 46 courses**, including
"¡Buenos días, Sarah!" and "Bonjour, Sarah !"; seed 1 has **116 distinct values across 130
courses**. Editing the canonical does not propagate — the change is *owed* to every course
rather than applied to it. The page says so, unmissably.

**If a control that reaches a learner is ever added to this page, the tier flips.** The
banner names the specific write it rests on so the claim stays checkable.

---

## 2026-09-01 — machine-generated evidence leaves the tracked tree; a fresh worktree costs 60 MB, not 352

**Decision.** Tom ruled "yes, move 290MB of machine logs out of the repo". 1,922 tracked
files — 279 MB of sweep dryrun/applied/verify logs, queue tails, censuses, snapshots,
screenshots and sample mp3s under `docs/` and `archive/docs-retired-2026-08-24` — were
copied byte-for-byte to `~/ssi-evidence/ssi-dashboard-v7/<same path>` with a
`MANIFEST.tsv` (git blob SHA + bytes + the commit removed at), then `git rm`'d at the
tip. `.gitignore` now excludes `*.json`/`*.jsonl`/`*.gz` and image/audio under `docs/`
and `archive/`, with named exceptions for schemas and the eight files committed tools
and tests actually read. `docs/EVIDENCE.md` and `tools/lib/evidence-path.cjs` say where
new evidence goes.

**Why it can't be reverse-engineered.** A fresh `git worktree add` was **352 MB**; it is
now **60 MB**. Job #625 measured the estate writing ~10 GB/day and found every byte was
`git worktree add` — ~30 a day, ~300 MB each, 195 accumulated. Its hourly reaper made
that survivable; this removes the cause. History is untouched, so the old bytes are
still there: only NEW worktrees are cheap.

**Better:** the churn is deleted at source rather than swept up hourly, and `docs/` goes
back to being 9 MB of markdown a human can actually read.
**Simpler:** one predicate — machine formats don't live in `docs/` — expressed as
gitignore patterns, no size gate, no per-tool retrofit, no lifecycle hook.
**Cheaper (total):** one copy, one commit. Tools may still write into `docs/`; the
gitignore means it never enters the tree, so no tool had to change for the number to
move. The store is one directory on this box, mirroring repo paths, addressable by the
same path anyone already knew.

**Searched & rejected.** `git filter-branch`/`filter-repo` to reclaim the history bytes —
rewrites every SHA on a repo with dozens of live worktrees and two deploy checkouts, for
disk that costs nothing per worktree (objects are shared); #625 rejected it too.
Sparse-checkout excluding `docs/` — workers write and publish from `docs/`, so the cone
fights the work. A size threshold — not expressible in `.gitignore`, so the tree and the
gate would drift apart. Deleting outright — the data is not worthless, and "move it
somewhere addressable" costs 284 MB of disk we have.

**Verified before removing.** Published docs render from the surface DB `content` column
(2,752 rows, zero empty; `/d/<id>` in `server.js` never touches `src` on disk) — one
published doc has a `src` inside `archive/docs-retired-2026-08-24` and still renders. No
done card points at a repo file (33 non-`/d/` URLs, all external sites). Nothing in
`services/` statically serves `docs/`. A grep over all 1,658 tracked non-doc files for
`docs|archive` path literals found 28 references, 8 of which resolve to a tracked file —
all 8 kept.

**Not done, said instead.** Worktrees on other branches keep the files until those
branches take this change; nobody else's worktree was touched. One-off scripts under the
gitignored `scripts/` that read moved paths will need the `~/ssi-evidence` prefix — they
are spent one-offs and were not retrofitted.

---

## 2026-08-31 — The metagraph is ratified past its derivation counts, and CORE is a placement, not a coverage number

**Decision.** The store now carries the ratified discursive layer — N301–N306 /
F301–F306 / C301–C302 / S301–S305 (talk-bollocks), five method-pod mints
(N902/3/7/8/9), N501 and F601 (Tom's rulings) — and a **declared m→store
crosswalk** in `tools/pods/pod-shape-aliases.cjs` (20 of 23 m-tokens land;
m6/m14/m15 unresolved by ruling: intra-turn, not exchange positions). Five mint
candidates were REJECTED as duplicates of rulings already on the page
(N901→F302, N904→N11, N905→N301, N906→F1, N910→F301) — the rejections are the
record that consolidation verdicts, once written, bind later minting.

**Why it can't be reverse-engineered.** `tools/metagraph-selfcheck.cjs` used to
assert the shape-graph document's own counts (17 nodes, 20 moves); it now
asserts the ratified counts, and the header says so. If a future reader finds
the store bigger than the derivation doc, the ratification doc
(`docs/pods/core-walks-ratification-2026-08-31.md`) is the missing link, and
`proposed/*.json` files whose status says RATIFIED are provenance records, not
double-load hazards — the store proper is the only loaded copy.

**The naming ruling applied.** CORE = the compulsory walk (live POD 1, slug
`pod-0` — the off-by-one stands); everything else is an optional walk, and
"optional names WHICH, never WHETHER". Consequence used throughout the audit
(`docs/pods/core-compulsory-set-audit-2026-08-31.md`): a guarantee can live in
CORE, or on EVERY optional walk (a second floor at zero compulsory cost), or
nowhere — and survivability recoveries attach to the CORE scene that already
stages their branch, never as appended scenes, because a recovery three scenes
late is worth nothing.

---

## 2026-08-29 — The language cast beats the course's stored voices, but a legacy config is not an override

**Decision.** The render path now resolves a course's voices in three legs:
**explicit course override → language cast (`voice_language_roles`) → the
course's stored `voice_config`.** An explicit override is a NEW deliberate
marker — `voice_config.overrideLanguageCast: true`, or the same key on one role
— never the mere presence of a stored config.

**Why three legs and not two.** Tom's ruling is that casting moves to the
language, which read strictly means the cast wins and a per-course voice is
consulted only where someone deliberately set one. But `voice_language_roles`
held **zero rows** when this landed and **94 of 149 courses** carry a real
stored `voices` block. A strict two-tier rule would therefore have changed what
every render in the estate decides, overnight, in nobody's favour — and Tom's
own framing was that nothing should notionally break for courses already made.
Treating the legacy config as an override instead would have made the cast
unreachable forever, which is the opposite failure. The third leg is the only
version that satisfies both halves: **zero cast rows means zero behaviour
change**, measured — 94/94 configured courses resolve byte-identical.

**Where the reader lives.** `services/shared/language-voice-cast.cjs`, pure and
unit-tested, so the rule can be read without opening phase8. The provider ladder
(`tts-provider-policy.cjs`) and the canonicaliser (`clip-identity.cjs`) are
untouched: the cast decides WHO speaks, the ladder still decides on which
provider.

**The seam.** `loadVoiceConfig()` is the render read and resolves; a new
`loadStoredVoiceConfig()` is the editor read and does not — saving a resolved
config back would copy the language's decision into 94 course rows and defeat
the point. phase8 does not go through either (it reads `course.voice_config` off
its own `select('*')`), so it resolves explicitly at the course fetch in
`planHandler`, at the relink voice gate, and at the pod known voice.

**Two defaults chosen here, not ruled by Tom.** (1) A role's gender is read from
the gender of the voice the course already has, so an existing course keeps the
gender it has; only where there is none does `target1`=f, `target2`=m, `known`=f
apply. (2) `presentation` is EXCLUDED from the cast — it is the intro/clone
voice, not a specimen of the language.

---

## 2026-08-29 — One canonical rendered pace; the pace-shaped reuse guard retired

**Decision.** Rendered pace is no longer a role or cadence decision. The cadence
multiplier in `getEffectiveSpeed` resolves to 1.0 and the hardcoded `slow` 0.8x
in `phase8-audio-from-baskets.cjs` goes. The per-VOICE base speed STAYS: that
corrects a voice's own natural pace and is a property of the voice, not of the
role a clip plays in.

**Tom, 2026-08-29:** "playback speed is a player concern, not a baked-in render
concern — the same clip plays faster when used as the known language and slower
as the target, so stop treating rendered pace as a reason for distinct clips."

**Consequence, accepted.** `isSpeedTrustedVoice` refused cross-role reuse of an
Azure clip because Azure bakes speed into the MP3 and `course_audio` persists no
per-row speed. With new renders all at one pace it describes nothing, so it is
retired to a constant carrying its own obituary. The cost falls on clips already
in the estate: an old Azure clip rendered at 0.8x can now be borrowed into a
role that would previously have re-rendered it, and plays at its baked 0.8x
until next re-rendered. Tom waived this in advance: "I don't care if anything
notionally breaks, because these courses are already made — it's only going to
affect regeneration, or replacement." No speed column was added to
`course_audio`; that migration is not needed by this ruling.

**Outstanding, deliberately not done here.** The other half — known-fast /
target-slow playback — lives in the player (`ssi-learning-app`, deploys
separately to Vercel) and is Tom's to schedule.

---

## 2026-08-28 — Voice casting lives in its own table, not on `voices`

**Decision.** Per-language voice casting is stored in a new table,
`voice_language_roles`, keyed `(language, gender, rank)` with a foreign key to
`voices.voice_id`. Rank 0 is primary, 1 is first backup.

**The alternatives, and why they lost.**

*Columns on `voices`.* `voices` answers "what is this voice?" — one row per
voice, with `languages text[]` for what it can speak. Casting asks a different
question: "for this language, who is the primary female?" One voice can
legitimately be primary female for Spanish and first backup for Italian, and a
column cannot express that without an array-of-structs. Cheaper to write,
dearer to query and dearer to keep honest.

*Overloading `voices.notes`.* Free text would have needed no migration at all.
It would also have made the estate's casting unqueryable prose, so the screen
whose entire purpose is "show me what is missing" could not have computed the
answer. Rejected on total cost, not on taste.

**Why this is better, simpler and cheaper.** Better: the completeness question
("which languages lack a female voice?") becomes a `GROUP BY`, which is what
makes the gap visible on sight. Simpler: one primary key expresses the whole
rule, and the `no_self_backup` unique index makes "cast as your own backup"
unrepresentable rather than merely discouraged. Cheaper: one small table with no
change to `voices`, so nothing that already reads voices had to be touched, and
`ON DELETE CASCADE` means a withdrawn voice empties its slot instead of leaving
a dangling reference — the language then reads as incomplete, which is the alarm
we want rather than a silent lie.

**Taste call left open for Tom.** Completeness is currently "both genders, ranks
0 and 1" — four voices per language. Tom asked for "2 voices … with backups";
two backups is the reading that makes "backups" plural without demanding six
voices across ~70 languages. It is one env var, `VOICELAB_REQUIRED_RANKS`.

**Consequence accepted.** Casting is not enforced anywhere yet — the render path
still selects via `tts-provider-policy.cjs`, which reads `voices`, not this
table. That is deliberate: this landed as a registry a human reads and fills,
and wiring it into automatic selection is a separate decision with a much larger
blast radius.

---

## 2026-08-28 — The Voice Lab reports characters, not dollars

**Decision.** The lab no longer claims a dollar figure for any run. `usd` is
`null` ("not priced"), never `0` ("free"). The daily ceiling is, and always was,
a character ceiling.

**Why.** The lab priced runs at xAI's published $15/M characters. xAI is retired
from selection, so that constant priced a provider the lab can no longer call.
Neither Cartesia nor Azure has a rate verified anywhere in this repo. Replacing
one stale number with another guessed one would have bought false precision on
the money path, which is the worst place to have it. Characters are countable,
enforceable and already the mechanism that refuses a run, so nothing was lost by
reporting only them.

---

## 2026-08-30 — The shape metagraph has a canonical home, and there is only one of it

**Decision.** The shape metagraph derived in
`docs/pods/shape-graph-2026-08-30.md` is now a stored artefact at
`services/shared/metagraph/` — `nodes.json`, `moves.json`, `edges.json`,
`outcome-shapes.json` and `walks/pod-0.json`, with `schemas/metagraph-v1-schema.json`
and one reader, `services/shared/metagraph/index.cjs`. Three things are settled by
this and are not re-openable without a new decision:

1. **One store, not one per lab.** The pod side and the seed/basket side read the
   same files through the same module. Neither gets a copy.
2. **Walks are sequences of node references.** A step *is* a reference to a node
   and a position; the surface sentence hangs off it as a property. Coverage —
   which shapes a walk traverses, which it hits twice, which it never reaches —
   is computable without parsing any prose.
3. **Two edge kinds and only two:** composition, and presupposition-of-survivability.
   Chaining is a property of the walk, recorded as a `pivot_capable` position, never
   a third edge.

**Why.** The graph existed only as prose, so nothing could load it — which is why
PODLAB makes you load a course before it shows you anything: a course was the only
structure the tooling could reach. Files rather than a table because the graph is
language-agnostic structure, not course content: it is small, it wants git history
and review, and `database/migrations/` takes no new files. Walks as node references
rather than annotated text because the next move after coverage is visible is
"select the shapes this pod should teach and let the walk be generated", and a
prose-shaped store forecloses that. One store rather than per-lab copies because two
copies drift inside a fortnight.

**What the store carries that a flatter one would lose.** Provenance and attestation
on every row: N6 repair has exactly one dialogic attestation in 231 rows, S2 (acting
on a hedge) has no attested recovery at all, N13–N17 rest on the Method Pod alone,
and four of the nine outcome shapes are attested nowhere and must be minted. That
asymmetry is the finding. `tools/metagraph-selfcheck.cjs` asserts it, along with
every count the derivation document states.

---

## 2026-08-30 — Script View: the determinism boundary, and the spaced-review slot

**Decision.** The Script View keeps generating (it is an editable QA surface, Tom's ruling), but
the part of it a learner is promised — structure, round composition, cycle order, and which
LEGO's basket each spaced-review slot draws from — is what must match the serving path. The
random half stops being rendered at all: **each spaced-review slot is now ONE row naming the
LEGO, tapped to expand into that LEGO's whole USE basket** ("the spaced rep part of the script
should JUST show the LEGO ID and its basket of USE phrases as a clickable expand" — Tom,
2026-08-30). Nothing on the page invents a drawn phrase any more.

**What was established first** (`docs/script-view/what-order-the-learner-hears-2026-08-30.md`):

- The Script View has always run its own generator (`services/learning-script-generator.cjs`,
  behind `/api/production/:courseCode/learning-journey`, production-api.cjs:8440). Its own header
  says so: *"dashboard mirror … no shared code — keep the two in sync by hand."* Confirmed, not
  suspected.
- The live learner path is **not** the bundle. `packages/core/src/script/generateScript.ts` is
  built but has **no caller in player-vue** and nothing fetches `/api/courses/:code/bundle` from
  the client. A learner is served by `/cycles` for the opening (DB position order) and then by
  `providers/generateLearningScript.ts` in the browser (shortest-first, via
  `capPhrasesByLength`). Wiring Popty to the bundle generator today would have mirrored a path
  nobody is served by — the brief's suggested target, and it was wrong.
- On phrase order the Script View and the live walk **agree** (both shortest-first, which
  `ralph-methodology.md` line 270 states as doctrine). The position-order sort lives in the
  bootstrap endpoint and in the unswitched bundle generator. A-307 is a question about those two,
  not about the review tool.

**Why the basket row rather than a seeded draw.** Reproducing the draw would have meant the view
carrying a second copy of a per-learner random process — the exact duplication that let the
position-order sort go unnoticed. A slot that names its basket is honest about precisely what is
determined, and it is cheaper: no seed to keep in step, nothing to drift.

**Known consequence, named rather than hidden.** Because the view no longer draws, a review can
no longer claim a phrase for the round, so CONSOLIDATE occasionally picks a phrase a learner's
draw would have taken (observed once across spa_for_eng's first 8 rounds). Item counts also fall,
because a slot is one row where it used to be up to three.

**What is NOT done, and is the larger remaining piece.** The deterministic half still has two
implementations — Popty's `.cjs` and player-vue's `generateLearningScript.ts` — kept in step by
hand. Collapsing them means promoting the live walk (not the bundle generator) into `@ssi/core`
and having Popty call it, which is a cross-repo build change (Popty is CJS, `@ssi/core` is ESM/TS)
plus a golden-master parity run over several courses. Estimated a day's work of its own, and it
should not start until the bundle cutover's client half is switched on or abandoned — otherwise
it will be redone.

**Decided by:** agent, under Tom's 2026-08-30 ruling on the spaced-rep rendering; the ordering
question (A-307) was deliberately left untouched.

---

## 2026-08-31 — The Voice Lab's three gaps: the consent key, hearing a voice with no clip, and a judging set

Tom, looking at the live page: *"1 - there is no way to give consent to a voice here. 2 - there is
no way to hear a voice that does not currently have a clip. 3 - there is only one clip per voice."*

**Gap 1, and it was ours.** Consent became REQUIRED to cast on 2026-08-31 — refused server-side at
every door — and the only routes that could SATISFY it created a NEW voice. Nine voices already in
the estate were refused everywhere with no door anywhere. This branch built a key; so, within the
hour, did another worker, for the cast screens (61d0b9122, `ConsentStep.vue` +
`POST /voices/:id/consent-declaration`). **Theirs stayed and mine was deleted** — it is better
argued (a dashboard session rather than admin, because the people who hit the lock are course
leaders; and a capture that cannot overturn a recorded no). One component, one route, one wording,
three screens. The Voice Lab's contribution is WHERE it opens — the chip that says a voice has no
consent IS the door, opening the panel under the row it was tapped in — plus two optional controls
on the shared panel, both off by default: hearing the voice before consenting to it, and a refusal
of exactly the same weight as the yes.

The old freeform consent form (status dropdown, name, date, note) went with it. It could mark a
voice `authorised` on typing alone, which was a second meaning of the word consent one screen from
the first.

**Gap 3 — what a judging set is, and why.** Three lines from ONE named course: the median line
(unchanged from the single line this module always picked, so every cached clip in the estate stays
valid and the row's one-press fair comparison still renders identical words for every voice), a
SHORT line (onset and tail, where a clone clips its first consonant or hangs a breath), and a LONG
one (breath, pace and drift, which four words cannot show). The short slot prefers a QUESTION where
the corpus has one, because rising intonation is where a clone most often gives itself away.
Deterministic, so two voices are never compared on different words.

**Per VOICE, not per row, and that is the cost decision.** The row press renders one line for every
candidate — the fair comparison that makes a shortlist. Three lines for eighty candidates would
triple the bill to answer a question nobody asked about seventy-seven of them, so the spend follows
the attention: a voice gets its extra clips when somebody opens it.

**Two defects found by driving it rather than by reading it.** `ConsentStep`'s `clipFile` was a
plain `let` behind a computed, so the spoken route could not be completed by anybody — you read the
line aloud and the button stayed disabled. And in the two-column guide layout the consent chip was
being clipped underneath the neighbouring card, unclickable: a decision that looks as though it was
never offered.

**Decided by:** agent, under Tom's 2026-08-31 gaps brief; the consent mechanism itself is his
2026-08-31 ruling and was reused, never re-invented.
