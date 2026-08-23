# Pod 1 — the staged pods are fixed, and learner progress survives the flip

*2026-08-23, written to your 21:15Z ruling: "We're not fixing any live courses. All we're doing is
fixing the staged courses. Then when done we will flip them all and retire the previous versions in
any of those courses. Double checking we've done the proper mapping of learner progress for the POD
cutover."*

*Sequenced to your 21:21Z ruling: "first we want to recast those ones we did today. Regenerate any
required audios. They will then be usable and a course can be flipped when both known and target
PODS have been completed. Then we should go back to making sure all languages have the new 231 line
pods and recast them properly by conversation, generate any audio and then repeat the course flipping
process." The flip-readiness checklist you can flip from is section 5.*

**No live pod was edited tonight.** Not a cast, not a speaker label, not a sentence, not an audio
link. Everything below happened on held, non-serving pods. The estate's live-pod count is unchanged
at 69, and every pod this job created is `held`.

---

## Read this first: firing the regen would still reach live learners

**A phase-8 regen aimed at a staged pod can change what a live learner hears right now.** Not
through the "fill the missing clips" endpoints, which are genuinely safe — through the redo/fix path
that any real repair of a bad staged clip would actually use. `/regenerate-single` and
`generatePodAudio{force:true}` update `course_audio` **in place, same uuid, with no pod-awareness at
all** (`phase8-audio-v13.cjs:4307-4318` and `:6450-6467`). The one endpoint that does check pod
linkage, `/regenerate-role`, explicitly excludes pod clips — so this failure mode is already known
from a 2026-06-07 incident, but the check was never extended to the single-clip and force paths.

The reason it reaches live is that staged pods point at the **same `course_audio` rows** as the pods
serving today. `clone-pod.cjs` copies audio ids by design, and the `pod-0-unrecorded` drafts were
built the same way. Measured: **4,639 clips are shared between staged and live pods** across the 21
Group 2 courses, 185–257 per course.

So the queue below is correct, and it is **not safe to fire until the clips are forked.** That is one
plain sentence rather than a queue that would quietly rewrite live audio.

**Decision, one word — FORK?** Before any staged-pod render, copy the 4,639 shared `course_audio`
rows to new uuids and new S3 objects and repoint only the staged pods, make-before-break. My
recommendation is yes: it is the only thing standing between "fix the staged courses" and "change
what live learners hear", it is a small mechanical script, and `revoice-clips.cjs` already proves the
pattern. The machinery does not exist yet — `clone-pod.cjs` does the opposite, it is *how* the
sharing happens. Evidence: job #139.

---

## 1. The 21 staged pods are fixed — all of them at zero

Every one of the 21 held `pod-0-unrecorded` pods now has the per-conversation cast: two voices,
male/female every conversation, **zero same-voice exchanges**, measured on live data after the write.

| | |
|---|---|
| Pods fixed | **21 of 21** |
| Same-voice exchange pairs remaining | **0** in every pod |
| Audio links before → after | **identical** in every pod, both tracks |
| Voices in each cast | **2** |
| Courses whose `voice_config` was written | **none** — no Group 2 course carries a `podCast`, so there was no course-level spill onto the live side |

Driven one pod at a time from an explicit id list, never `--all` — whose filter selects exactly the
live set this ruling protects. The probe went first: `nld_for_eng` dry run, read, applied, verified,
and only then the other twenty.

**Named exceptions.** `isl_for_eng` is cast like the rest and reaches zero, but **its blocker is
unchanged and untouched by me**: 10 of its 231 target clips still fail the audio veracity gate
(`docs/pods/isl-pod1-hold-decision-2026-08-22.md`). `cym_n_for_eng` and `cym_s_for_eng` are
human-voiced Welsh and were skipped by name. `fin_for_eng` is genuinely uncastable — one ungendered
human voice, no male/female pair — and stays deferred. Nothing refused; nothing left half-applied.

## 2. Staged copies for the 21 live courses — 19 built, all held

Each castable Group 1 course now has a copy of its live pod under slug **`pod-1-staged-2026-08-23`**,
so the flip you perform later replaces the live pod rather than editing it. 19 courses (21 minus
Welsh and Finnish), 231/232 rows each, audio ids carried across, nothing deleted and nothing moved.
All 19 verified `held`.

No repo convention contradicted the slug — the existing `pod-0-unrecorded` convention describes a
different situation (an unrecorded draft of pod-0), so I used the new name and am flagging it as a
naming call, not a correctness one.

**A defect found and fixed on the way.** `clone-pod.cjs` omitted `visibility` on insert, and that
column **defaults to `live`** — so the tool whose stated purpose is a copy that is not learner-facing
was creating learner-visible pods. That is how 40 non-serving pods came to be live and needed today's
17:20Z sweep. It now writes the column explicitly, defaults it to `held`, and reads it back after the
write, refusing if it is not what was asked.

**The cast fix is a verified no-op on all 19.** The clones carry this morning's corrected cast
already, so the proposed cast is byte-identical to the stored one on every course and there was
nothing to write. Dry runs are committed as the evidence.

### What a Group 1 learner experiences today

Nothing changed for them at 20:00Z, and I can show why rather than assert it. The player never
renders a speaker label — no template in `player-vue` reads `.speaker`; the field is used only to
group turns and compute gaps, and the relabel is a bijection within each scene, so every adjacency
relationship it depends on is preserved. And nothing on the playback path reads
`listening_pods.speakers` at all: the cast is a **render-time** input, so what a learner hears comes
from the linked clip and nothing else. A learner on a Group 1 course today therefore hears exactly
what they heard yesterday — the old renders, still carrying the same-voice exchanges. The correction
is in the database only and becomes audible when the clips are re-rendered.

I did **not** revert this morning's writes. Reverting is itself an edit to a live course, and undoing
a verified fix on your behalf without your word is worse than leaving it.

## 3. The regen queue now describes the staged pods: 1,718 clips

Re-derived on the real unit — the distinct clip — against the staged pods instead of the live ones.
It reconciles line by line against the 1,054 it replaces:

| | clips | |
|---|---|---|
| English known side, Group 1 | 284 | the same clips as the live queue |
| Group 1 target track | 770 | identical per language to the live queue |
| Group 2 target track | 582 | **new** — the 21 staged pods the live queue never saw |
| English known side via Group 2 only | 82 | **new** |
| **Total** | **1,718** | |

In your units: **231 lines per pod**, and the median language sits at **13% of the pod**. Only three
languages exceed 25%:

- **spa 105 clips, 45.5%** and **fra_ca 80, 34.6%** — unchanged from the live queue, already
  evidenced in job #136 as one character's historical mis-cast and a first-ever cast pass
  respectively.
- **tha 76 clips, 32.9%** — new, and not solver noise: all 76 are flagged as pre-existing drift, and
  the voice moves show the staged pod was drafted with **five** different voices (eve, rex, and three
  others) collapsing to the two-voice cast. It is a draft that was never cast to two voices in the
  first place, not a recast of good audio.

Everything else lands between 4% and 20%.

One honesty note on the table: for the Group 1 staged clones the cause column reads "divergence"
rather than "recast". That is a labelling artefact — provenance is keyed by pod id and the clones
have no applied log of their own. The clips and the counts are identical to the live queue, where the
same clips were attributed to the recast.

**Where things live.** Queue: `docs/pods/pod1-recast-regen-queue-by-language-staged-2026-08-23.json`.
The 1,054 file is kept as `pod1-recast-regen-queue-231-scope-2026-08-23-superseded.json`. All 63
audio-pass requests are re-stamped to the staged queue — 40 with work, 23 stamped zero (the 16
`eng_for_*` courses and the 7 variant pods, which are out of scope under the reframe, so a stale
live-scoped request can no longer be fired against them). Every re-stamped request carries the
shared-clip gate in its reason text, so nobody can fulfil it without seeing the hazard above.

**Queueing is where my work ends. Firing is yours.**

## 4. Progress mapping: yes, it survives the flip

**Verdict.** Flipping a staged pod in preserves each learner's position and progress correctly. The
mapping was dry-run across all 21 Group 2 courses — 541 progress rows, of which **373 carry their
exposures onto the new slot and 168 drop as removed content**, with **zero matches rejected by the
position bound anywhere in the estate**, so there is no case of a real learner losing a rung to the
8-position rule. Three full rehearsals then proved it end to end on throwaway clones, promote **and**
rollback, on the courses that actually have progress to lose: `swa_for_eng` (296 rows → 202 carried,
94 dropped), `isl_for_eng` (90 → 52/38) and `ell_for_eng` (32 → 31/1). All three PASS: pods restored
to their original slugs and counts, every survivor carried back on rollback, and no orphaned progress
row. The rehearsal carry counts match the dry-run predictions exactly, which is the cross-check that
makes this a proof rather than a demo. On the delivery side, all five learner read paths in the
learning app go through one resolver that prefers `pod-1`, with nothing left hardcoding the old slug,
so promoting a staged pod onto `pod-1` is genuinely what a learner then sees. **The one caveat:** the
168 dropped rows are content genuinely removed between the 142-line and 231-line pods, and dropping
costs a little re-listening and nothing else — progress cannot go backwards by construction.

### Per-course, all 21

| course | progress rows | carried | dropped | rejected by the bound |
|---|---|---|---|---|
| swa | 296 | 202 | 94 | 0 |
| isl | 90 | 52 | 38 | 0 |
| ell | 32 | 31 | 1 | 0 |
| gle | 29 | 16 | 13 | 0 |
| ukr | 22 | 16 | 6 | 0 |
| lav | 19 | 17 | 2 | 0 |
| nld | 13 | 9 | 4 | 0 |
| cat | 11 | 6 | 5 | 0 |
| hye | 8 | 4 | 4 | 0 |
| heb | 7 | 7 | 0 | 0 |
| dan | 6 | 6 | 0 | 0 |
| nor | 3 | 3 | 0 | 0 |
| tha | 3 | 3 | 0 | 0 |
| hin | 2 | 1 | 1 | 0 |
| bul, est, fas, lit, nep, pol, tur | 0 | 0 | 0 | 0 |
| **total** | **541** | **373** | **168** | **0** |

### Two guards that had to come down first

Nobody could rehearse a switchover at all when this job started, which means the check you asked for
could not have been run.

1. `realHumanLearners()` refuses a `zzz_` scratch code — correct for reporting, since a fixture must
   never be counted as a person — but `pod-switchover.cjs` called it unconditionally, so a rehearsal
   threw on any course that **has** progress. That is every course worth rehearsing. A scratch course
   has no real humans by definition, so it now says so instead of asking.
2. The staged pod's content-readiness blockers (untranslated, draft, unrecorded) fire on every staged
   pod on the estate, because none is recorded yet — so no rehearsal could reach the promote step.
   `--rehearsal` waives those and only those, and `pod-switchover.cjs` **refuses the flag outright on
   anything but a `zzz_` code**, so it can never waive a gate on a real course. Every
   migration-correctness blocker still binds, duplicate-text ambiguity in particular.

Both scratch courses were dropped afterwards and verified gone.

### Sequencing you will need, not performed

`archive-pod.cjs` refuses to move a pod carrying `learner_pod_state` rows — that is a switchover, not
an archive, and the refusal is correct. `pod-switchover.cjs` refuses to promote onto an occupied
slug. So each Group 1 flip must archive the live pod first, then promote. I have not performed any
part of it.

---

## 5. Flip readiness — the checklist to flip from

Your rule: a course may flip only when **both** its target-language pod and its known-language pod
are complete — recast correct *and* audio complete. Measured live against every staged pod, both
tracks.

**Nothing is ready to flip tonight — 0 of 40.** Every pod is recast-correct; none has finished audio.
That is the honest state, and the table says exactly what each course still needs.

Three things stand between here and the first flip, and they are very different sizes.

**The known side is ONE job, not forty.** Every course's known-track blocker is the same shared
English clip pool: **366 distinct clips, pooled across all 40 courses** (7.5 line-links per clip). No
non-English language has a single known-track clip in the queue. Re-render those 366 once and the
known pod completes for every course on this list simultaneously. That is the highest-leverage item
in the whole rollout.

**The target side is per course**, and for your step-one cohort it is the *only* remaining work:
**16 Group 1 courses need nothing but clip regeneration** — no translation, no drafts, no missing
renders. Those are `ara_eg, ara, deu, eus, fra, hrv, ita, jpn, kor, por_br, por, ron, spa, spa_mx,
swe, zho`, and they are exactly the "recast those ones we did today, regenerate any required audios"
set. Together with the shared English pool, that is the shortest path to your first flips.

**A blank row blocks 22 pods on a technicality.** Scene 15 / sentence 12 (`SC15-S012`) is empty on
*both* sides with no audio on either track, on 20 staged Group 2 pods and 2 of the Group 1 clones
(`ara_sy`, `fra_ca`). It is unrenderable and unshowable, so it sits in the readiness gate as a
permanent blocker, and it is also the whole of each of those courses' "1 missing known audio". This
is a known class: `tools/pods/delete-blank-pod-sentence.cjs` exists for exactly it, is triple-locked
(the row must match the id, be empty on both sides, and have NULL audio on both tracks), refuses any
slug that is not `*-unrecorded`, and aborts if any learner progress touches the row. It was already
applied to `ita/spa/fra/zho` on 2026-08-22. Zero learner progress touches any of the 22. **I have not
run it — deletion is yours.**

**Priority order, per your sequencing.** Group 1 first (below), then Group 2.

**Group 1 — step one: the pods recast today, needing audio**

| course | target pod | known pod | ready to flip |
|---|---|---|---|
| ara_eg | 30 clips to regen | 123 clips to regen | no |
| ara | 44 clips to regen | 123 clips to regen | no |
| ara_sy | 1 untranslated, 108 draft, 107 unrendered, 34 clips to regen | 1 unrendered, 123 clips to regen | no |
| deu_at | 155 draft, 131 unrendered, 29 clips to regen | 44 clips to regen | no |
| deu | 34 clips to regen | 44 clips to regen | no |
| eus | 14 clips to regen | 44 clips to regen | no |
| fra_ca | 1 untranslated, 112 draft, 111 unrendered, 80 clips to regen | 1 unrendered, 44 clips to regen | no |
| fra | 25 clips to regen | 44 clips to regen | no |
| hrv | 47 clips to regen | 47 clips to regen | no |
| ita | 29 clips to regen | 123 clips to regen | no |
| jpn | 44 clips to regen | 44 clips to regen | no |
| kor | 44 clips to regen | 44 clips to regen | no |
| por_br | 36 clips to regen | 123 clips to regen | no |
| por | 36 clips to regen | 123 clips to regen | no |
| ron | 25 clips to regen | 44 clips to regen | no |
| spa | 105 clips to regen | 123 clips to regen | no |
| spa_mx | 44 clips to regen | 123 clips to regen | no |
| swe | 44 clips to regen | 44 clips to regen | no |
| zho | 26 clips to regen | 44 clips to regen | no |

**Group 2 — step two: the 21 courses still on the 142-line pod**

| course | target pod | known pod | ready to flip |
|---|---|---|---|
| bul | 1 untranslated, 109 draft, 2 unrendered, 21 clips to regen | 1 unrendered, 44 clips to regen | no |
| cat | 1 untranslated, 116 draft, 117 unrendered, 42 clips to regen | 1 unrendered, 123 clips to regen | no |
| dan | 1 untranslated, 129 draft, 130 unrendered, 40 clips to regen | 1 unrendered, 44 clips to regen | no |
| ell | 1 untranslated, 114 draft, 115 unrendered, 15 clips to regen | 1 unrendered, 44 clips to regen | no |
| est | 1 untranslated, 109 draft, 5 unrendered, 14 clips to regen | 1 unrendered, 44 clips to regen | no |
| fas | 1 untranslated, 122 draft, 123 unrendered, 10 clips to regen | 1 unrendered, 44 clips to regen | no |
| gle | 1 untranslated, 117 draft, 118 unrendered, 10 clips to regen | 1 unrendered, 44 clips to regen | no |
| heb | 1 untranslated, 126 draft, 127 unrendered, 35 clips to regen | 1 unrendered, 123 clips to regen | no |
| hin | 1 untranslated, 132 draft, 133 unrendered, 40 clips to regen | 1 unrendered, 126 clips to regen | no |
| hye | 1 untranslated, 126 draft, 3 unrendered, 14 clips to regen | 1 unrendered, 44 clips to regen | no |
| isl | 10 unrendered, 19 clips to regen | 44 clips to regen | no |
| lav | 1 untranslated, 101 draft, 102 unrendered, 22 clips to regen | 1 unrendered, 44 clips to regen | no |
| lit | 1 untranslated, 109 draft, 110 unrendered, 23 clips to regen | 1 unrendered, 44 clips to regen | no |
| nep | 1 untranslated, 100 draft, 101 unrendered, 12 clips to regen | 1 unrendered, 44 clips to regen | no |
| nld | 1 untranslated, 115 draft, 116 unrendered, 42 clips to regen | 1 unrendered, 44 clips to regen | no |
| nor | 1 untranslated, 113 draft, 114 unrendered, 34 clips to regen | 1 unrendered, 44 clips to regen | no |
| pol | 1 untranslated, 123 draft, 124 unrendered, 46 clips to regen | 1 unrendered, 123 clips to regen | no |
| swa | 1 untranslated, 113 draft, 114 unrendered, 11 clips to regen | 1 unrendered, 44 clips to regen | no |
| tha | 1 untranslated, 106 draft, 107 unrendered, 76 clips to regen | 1 unrendered, 62 clips to regen | no |
| tur | 1 untranslated, 118 draft, 119 unrendered, 41 clips to regen | 1 unrendered, 44 clips to regen | no |
| ukr | 1 untranslated, 109 draft, 110 unrendered, 15 clips to regen | 1 unrendered, 44 clips to regen | no |

### Also worth your eye: five live courses are serving incomplete pods

Not caused by anything tonight, and not on the flip path, but it showed up while measuring and you
should know. Five courses that were built straight at the new size are **live** with substantial
missing target audio: `cym_s_for_eng` 231 of 231 lines unrendered, `fin_for_eng` 213 of 232,
`deu_at_for_eng` 131 of 231, `fra_ca_for_eng` 111 of 232, `ara_sy_for_eng` 107 of 232. For Welsh and
Finnish that is expected — they are awaiting human recording, and Welsh is in Aran and Catrin's live
queues. For `deu_at`, `fra_ca` and `ara_sy` it is a genuine gap: they are TTS courses serving a pod
where roughly half the target lines have no audio at all.

---

## What failed, and what needs you

**Failed:** nothing. Every pod that was attempted landed.

**Gaps, stated rather than papered over:** it is not established whether the in-place-regen hazard has
already fired historically against those 4,639 shared ids, and the shared-clip exposure was measured
for the 21 Group 2 courses but not repeated for the 19 Group 1 clones I created tonight — they share
by the same mechanism, so treat them as exposed until measured.

**Decisions, one word each:**

1. **FORK the 4,639 shared clips before any staged render?** My recommendation: **yes** — it is the
   only thing between "fix the staged courses" and changing live audio, and it is a small script.
2. **DELETE the blank `SC15-S012` row on the 22 pods it blocks?** My recommendation: **yes** — it is
   empty on both sides with no audio and no learner progress, it can never be rendered or shown, the
   precedent was already set on four courses on 2026-08-22, and the tool refuses everything except
   exactly this. It is a permanent readiness blocker on 22 of the 40 pods until it goes. (The tool
   only accepts `*-unrecorded` slugs, so the two Group 1 clones would need a one-line widening.)
3. **Wire the cast solve into the switchover path** before the next 21 flips, rather than running an
   after-the-fact recast sweep 21 more times? Carried over from job #136 and still open. My
   recommendation: **yes**, for the same reason as last time — 21 courses are queued to go through
   exactly this path.
4. **`pod-1-staged-2026-08-23` as the staged slug** — a naming call, flagged rather than assumed.
