# Appendix — mechanics, gates, migration and the honest costs

**Companion to `AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`. Design only.**

Everything in the one-page design is asserted here with the live query or code that backs it. Where
a published document and the live system disagree, both numbers are stated and the live one wins.

---

## A. The live picture, measured today

All figures from the production database via `.env.psql`, 2026-08-06.

| | |
|---|---|
| `course_audio` rows | **2,532,679** |
| distinct `s3_key` values | **2,336,017** |
| files referenced by more than one row | **81,686** |
| rows at `audio_revision > 1` | **1,131** (0.04%) |
| rows ever checked by the veracity gate | **1,134** (0.04%) |
| `deu_for_eng` rows still marked `::superseded-regen` | **107** |
| `deu_for_eng` distinct voice ids on the German side | **10** |
| course-sides estate-wide with >2 voice ids | **200** |
| rows with `duration_ms` null | 694 |

Two of those deserve a second look. **The gate has effectively never run**: 1,134 clips out of 2.53
million have a veracity verdict. And **versioning is barely used**: 1,131 clips have ever been
revised, so the `.v2` mechanism protects ~0.04% of the estate and every other clip is at a bare uuid
whose bytes may be silently replaced.

### What deduplication is worth, measured

Same database, same day. These are the figures behind the design's identity section.

| | |
|---|---|
| distinct `(language, text_normalized, voice_id)` — **the logical identity** | **2,099,110** |
| distinct `(language, text_normalized)` — voice-free, for comparison only | **1,295,114** |
| rows that would share an identity — `sum(n−1)` | **433,569** |
| rows that share a file today — `sum(n−1)` over `s3_key` | 196,661 |
| identities used by more than one course | **135,878** |
| identities used by more than one role | **47,296** |
| `(language, text_normalized)` pairs appearing under more than one role | **563,729** |
| texts where the `target1` and `target2` voices **differ** | **658,984** |
| texts where those two voices **match** | 13,275 |
| texts carrying three or more voices | 88,205 |

**The headline: 2,336,018 distinct keys collapse to 2,099,110 identities — 236,908 objects (10.1%)
exist only because the same sentence was rendered again for a different course or a different side.**
That is the render and storage saving, and it is a **floor**: it is measured at key level, and step 1's
hashing pass can only find more, because two independent renders of the same text sometimes produce
identical bytes and always produce two keys.

**Sharing roughly doubles.** 196,661 rows ride a shared file today; 433,569 would ride a shared
address. Note what does *not* happen: rows do not collapse. The per-course row survives (§B), so the
433,569 is the count of rows sharing an address, never a count of rows deleted.

**Why the voice-free column is quoted and not adopted.** 658,984 texts against 13,275 settles it —
`target1` and `target2` are deliberately different voices, so a voice-free identity would collapse
the two target sides onto one voice and silently revoice 659,000 slots. The 804,000-identity gap
between the two columns is therefore mostly *design*, not waste.

The waste inside that gap is voice drift, and the key does not fix it — **step 2 does**. Summing the
distribution above, the identities beyond a two-voice shape number **~197,000**. Stated as an upper
bound and not a measurement: a language that is known in one course and target in another
legitimately carries more than two voices, so the true drift figure is lower and cannot be separated
from the legitimate figure without a per-course-side voice declaration, which is what step 2 creates.

*Query caveat, stated because it bears on trust: the two `count(distinct …)` cross-tabs took 67 s and
404 s against the pooler and the first attempt at the cross-role/cross-course counts was killed by the
default statement timeout. They were re-run as a single scan with `statement_timeout` raised. Nothing
was estimated or sampled; every figure above is a full count.*

### Live corrections to the briefing documents

1. **The revision-bump trigger does not exist.** Docs 92bfd5c4 and
   `deu-truncation-root-cause-2026-08-06.md` both state the guarantee "a clip's bytes may never
   change without its `audio_revision` changing — enforced by a database trigger" and one says "I am
   landing it next". The triggers live on `course_audio` today are `audio_autolink`,
   `course_audio_audit`, `course_audio_sync_duration`, `course_audio_touch_audio_stamp`,
   `course_audio_touch_content_stamp`, `trg_course_audio_normalize`. **No such trigger.** And it
   could not have worked as described anyway: `course_audio_touch_audio_stamp` fires on a change to
   `s3_key` or `audio_revision`, but an in-place S3 rewrite changes *neither* — the row is not
   touched at all, so no trigger on that table can observe it. Doc says landed; live says absent and
   structurally unable to catch the actual event.

2. **The offline bundle already applies versioned refs — mostly.** The brief flags
   `api/courses/[code]/bundle.ts` as building refs without version suffixes. On `origin/dev` it
   calls `fetchRevisedAudioRefs` and stamps legos, phrases, seeds, pods and pod sentences
   (commit `046cd1ff`). **The surviving hole is bookends**: `bookendRows` is the one collection not
   passed through `stampRowAudioRefs`, and its refs are built from the bare `row.id`
   (`bundle.ts:681-687`). So the gap is narrower and more specific than briefed — two clips per
   course, not the whole bundle.

3. **The `immutable` cache header is already deployed on a mutable store.**
   `services/shared/audio-cache-control.cjs` sets `public, max-age=31536000, immutable` on every
   audio object, and its own header justifies this by asserting that "every render, revoice or repair
   writes a NEW key rather than replacing the bytes at an old one". The 3 August rewrites disprove
   the premise. The header is correct *for the system we are designing* and unsafe for the one we
   have — which is the strongest single argument for making the premise true by construction.

---

## B. The store

**Hash.** SHA-256 of the final mastered bytes, base32-encoded, truncated to 26 characters (~130
bits). Chosen because collision risk is nil at any estate size we will ever reach, it is
case-insensitive so it survives S3 key handling and filesystems without surprises, and it is short
enough to read in a log line. *Taste-safe default — flagged, not a ruling.*

**Key layout.** `audio/<c1c2>/<c3c4>/<full-hash>.mp3` — two nibble-pair prefixes for even
distribution across S3 partitions. *Taste-safe default — flagged.*

**The logical identity, and where it is enforced.** `(language, text_normalized, voice_id)` is the
lookup key: it answers *does this need rendering?* before step 3 spends anything. It lives on
`audio_objects` as a **unique constraint**, which is the whole of the dedup mechanism — one identity,
one current object, enforced by the database rather than by whoever remembers to check.

It has to be a **partial** unique index — `(language, text_normalized, voice_id) WHERE superseded_at
IS NULL` — and the reason is worth spelling out, because a plain unique constraint would quietly
break this design. Re-rendering a clip to fix it produces the same identity and a *different* hash,
so two objects legitimately share one identity: the one in use, and the one it replaced. Since
nothing is ever deleted (§F), the old object must be allowed to stay. `superseded_at` is what
distinguishes "the current answer for this identity" from "an object that was the answer once", and
the partial index enforces uniqueness over the former only. Without it, the first fix to any clip
would be rejected by the very constraint meant to enable sharing.

This is a *weakening of a constraint the estate already has*, and that is the cheapest possible shape
for it. `course_audio` today carries
`unique_course_audio_per_voice UNIQUE (course_code, text_normalized, language, role, voice_id)`.
Removing `course_code` and `role` — exactly the two columns Tom's constraint removes — leaves the
identity above. Nothing new is invented; two columns come out.

`text_normalized` is already a stored, trigger-maintained column
(`trg_course_audio_normalize` → `normalize_text`), so the key needs no new normalisation code and no
back-fill of its own. The design section states what that function does and the two narrow holes it
leaves; both are safe to tighten later, because a normalisation miss costs one extra render and never
a wrong clip.

**A new table, `audio_objects`**, one row per distinct hash: hash (primary key), byte size, duration,
loudness, speech start/end, the gate verdicts, and the language, normalised text and voice it was
rendered from — the last three carrying the unique constraint above. This is the store's index and,
more importantly, its **gate**:

> `course_audio.content_hash` carries a **foreign key to `audio_objects`**, and only the gate writer
> inserts into `audio_objects`.

That single constraint is the enforcement Tom asked for, in the same spirit as the
`components_never_introduced` trigger on `course_practice_phrases`: a row that links audio which
never passed the gates is not forbidden by policy, it is **rejected by the database**. A script
cannot route around it, because there is no path from raw TTS output to a linkable address that does
not go through the gate.

**The per-course row survives, and deduplication makes it load-bearing.** `course_audio` keeps its
uuid, its course, its role, its text and its voice, and gains `content_hash`. It stops owning
`s3_key` — the key is derivable from the hash. This preserves the serve path's shape exactly and
matches what the census found: sharing is at the file level, with each course keeping its own row.

Under the dedup constraint this stops being a preference and becomes structural. Course and role are
no longer in the clip's identity, so **`course_audio` is the only place they exist at all** — it is
the link layer, and it is what makes one object serve 133 courses without the object needing to know
about any of them. `unique_course_audio_per_voice` stays exactly as it is on this table: a course
side still gets one row per text per voice, and that is the right constraint for a *slot*. The two
uniqueness rules now sit at their proper levels — the slot is unique per course and role, the object
is unique per identity.

**What retires.** `audio_revision`, the `.v<N>` ref suffix, `parseAudioRef`/`buildAudioRef`/
`fetchRevisedAudioRefs`/`stampRowAudioRefs`, and the bookend gap along with them — all of it exists
only to work around addresses that change meaning.

**One row-level change worth naming.** `course_audio.voice_id` becomes derivable from the object
rather than independently asserted by the row, which removes a class of drift the estate demonstrably
has: today the English voice `eve` appears on German rows, and nothing stops a row claiming a voice
its bytes do not have. Once the row points at an object whose identity *contains* the voice, that
claim and those bytes cannot disagree. Keep the column — the serve path and the audit queries read it
— but it becomes a denormalised copy with a single source of truth behind it.

**What `courses.audio_stamp` becomes.** It survives, with a narrower and now-honest job: **it is a
freshness signal for the list of ids, never for the bytes.** A device compares its stamp, re-reads
the script when it moves, and discovers new addresses. It is no longer load-bearing for correctness
— if a device misses a stamp bump it plays a slightly older lesson, not the wrong audio. That is a
real reduction in what can go wrong quietly.

---

## C. The gates

Run on the **mastered** bytes, before the object is admitted. An object that fails is never hashed
into `audio_objects` and therefore cannot be linked: **ungated audio is debris, never a hazard.**

**Every gate measures the stored clip at its natural rate, and none of them is speed-dependent.**
Since no speed variants are stored and a rate is applied at playback (design, *What a clip is*), the
gates judge the render and not the delivery. This matters most for the sizing tier, which is the one
that reads as though it might be about speed: it asks whether a phrase's syllables are all *present*,
and playback rate is a uniform transform applied afterwards that can neither create a missing
syllable nor remove one. The 2.5σ threshold and the 9-syllables-per-second absolute floor are
therefore properties of the bytes alone. At a 2× playback rate a learner hears eighteen syllables per
second; the floor is unmoved, because it was never a claim about what is followable — it is a claim
about what is damaged.

A second consequence, and a mild benefit: **the gates get cheaper as dedup bites.** They run per
object, not per row, so the same English sentence needed by forty courses is gated once. Set against
the estate's 2,099,110 identities rather than its 2,532,679 rows, that is 433,569 gate runs — and
their whisper tier, the expensive one — that never happen.
That is the clean answer content addressing buys, and I do agree with it — with one caveat: debris
still costs storage, so failures should be written to a quarantine prefix with their verdict, so a
human can hear what failed and why.

### Adopt, do not invent

`services/audio-intelligence/` in this working tree already implements three of the four tiers, was
written today, and is **untracked — it is not committed to any branch.** It should be. Its tier
headers carry measured justifications and explicit limits, which is exactly the standard this needs.
It references an `engine.cjs` that does not yet exist; composing the tiers is the missing piece.

| tier | file | verdict |
|---|---|---|
| 1 · syllable-rate duration | `audio-intelligence/tiers/duration.cjs` | **adopt as written** |
| 2 · tail shape (stopped vs cut) | `audio-intelligence/tiers/energy.cjs` | **adopt as written** |
| 3 · speech-span VAD | `audio-intelligence/tiers/vad.cjs` | **adopt as written** |
| 4 · whisper CER | `services/audio-veracity.cjs` | **adopt unchanged** |
| composition | `audio-intelligence/engine.cjs` | **missing — build** |
| loudness / true-peak | — | **missing — build** (see below) |

**Why the tier order matters.** Tier 3 finds where the speech actually is; tier 1 divides syllables
by *that* span, not by file duration, so mastering padding cannot move the threshold; tier 2 asks
whether the ending was a stop or a cut; tier 4 is the expensive one and only needs to run on what
the cheap tiers escalate.

**Whisper CER — what it is genuinely for, and what it cannot do.** Good at: wrong words, silence,
truncation severe enough to lose a word. Validated at 98.8% recall on 165 real clips. Blind to:
anything where the right words are present but wrongly delivered. Tonight's proof — the 1.0s clipped
take and the 1.4s good take of "as often as possible" both transcribe perfectly, CER 0. Also, per
its own header: never tested on mispronunciation, and its threshold was fitted on German and English
only. `audio-veracity.cjs` already returns three outcomes (`pass: true|false|null`) so an unchecked
clip cannot be mistaken for a passing one — keep that property; it is the right shape.

### The duration check, with the numbers behind it

I tested two candidate baselines against the actual pair of clips from tonight
(`181aa253…` good, 1392 ms; `413E7424…` bad, 1032 ms; same voice `eve`, same text).

- **Per-voice length regression** across `deu_for_eng`: `eve` fits 183 ms + 54.25 ms/char, with a
  **400 ms residual standard deviation** (mean absolute error 16.8%). Predicted 1268 ms — the bad
  take sits at −0.6σ. **A 2.5σ gate on this baseline would not have caught it.** Stated because it
  is the obvious approach and it does not work.
- **Sibling cohort** — same normalised text, same voice, across the estate: spreads of **96–152 ms
  standard deviation** for the cohorts I measured on this phrase. An order of magnitude tighter. On
  the `gfzdpspr5fdp` cohort (mean 1421 ms, sd 152) the bad take is **−2.6σ and fails**; the good take
  is −0.2σ and passes.

So: **cohort first, model as fallback — but be clear which one is the future.** Where two or more
known-good takes of the same text and voice exist, judge against them.

Deduplication settles what the previous draft could only anticipate. A cohort is "same normalised
text, same voice, across the estate" — which is *precisely* the logical identity. Once the store
holds one object per identity, **a cohort of more than one cannot exist for newly rendered audio.**
The cohort method does not merely thin; for anything born after step 2 it is structurally
unavailable. It stays valuable in exactly one place, and it is a large place: the **legacy estate**,
where 433,569 rows currently hold duplicate takes of an identity. Those duplicates are the calibration
set — worth mining before step 3 converges them, because after that they are the last cohorts the
estate will ever have.

So the model is not a fallback, it is the steady state, and it should be built as the primary. Fall
back to — properly, *rely on* — the voice's own seconds-per-syllable distribution, which is what `tiers/duration.cjs` already does and is the better
model because syllables track speech where characters do not ("words are useless, but syllables are
pretty consistent"). Its two guards are right and should stand: 2.5σ below the voice's own rate, and
an absolute floor of 9 syllables/second that applies even to an uncalibrated voice, so a calibration
polluted by damaged clips cannot normalise damage into acceptability.

**Calibration.** Build the per-voice baseline from clips that pass every other tier, per voice and
per language, refreshed as the store grows. English and German have fitted syllable counters;
nothing else does, and for an unfitted language the tier must report `calibrated: false` and be
advisory only. That qualifier has been lost once already — do not lose it again.

**Loudness and peak — the piece nobody has built.** Measure integrated loudness (LUFS) and true peak
on the mastered bytes. Estate evidence says the target is about **−15.5 dB**: the 25 clips measured
in `deu-loudness-cluster-test-2026-08-06.md` all sat between −15.0 and −16.3 dB, and un-normalised
older audio is exactly what sounded "quieter and duller". Proposed band: **±1.5 dB of the course's
declared target, true peak below −1 dBTP.** Both are one `ffmpeg -af ebur128` pass. Worth stating
plainly: loudness has **not** been the defect in any of this week's failures — that measurement
found one cluster, not two — so this gate is there to keep an already-good property from drifting,
not to fix something broken.

**Scope.** Specified for TTS-generated course audio. **Pod and human-recorded audio is an open
question, not silently included**: real recordings carry breaths, deliberate pauses and natural level
variation that these thresholds would flag. The tail and loudness tiers are probably safe there; the
syllable-rate tier is probably not. Needs its own calibration pass before it is pointed at recorded
material.

The foreign key sharpens that open question into something that needs an answer before build, so it
is flagged here rather than discovered later. If `course_audio.content_hash` references
`audio_objects` and only the gate writer may insert there, then **recorded audio cannot be linked at
all until it has a way into the store** — and the 104,629 pod rows in the estate today
(`pod_explainer`, `pod_fine_known`, `pod_take_g`) are not a rounding error. Deduplication and gating
are separable concerns and the store should treat them so: an object can be content-addressed,
identity-keyed and shared without having passed the TTS tiers. The clean shape is a third verdict
value on admission — *gated-pass*, *gated-fail*, *not gated: recorded* — which is the same
three-outcome honesty `audio-veracity.cjs` already gets right with `pass: true|false|null`, applied
one level up. That keeps "ungated audio is never linkable" true for TTS, where it is the whole point,
without making recorded audio unlinkable, which was never the intent. **Still Tom's call whether pods
are in scope at all; this only ensures that answering "out" does not accidentally mean "broken".**

---

## D. Offline bundles and the device cache

**A bundle manifest becomes a list of permanent addresses.** Every entry is a hash; every hash means
one exact set of bytes forever.

**Can a bundle go stale?** Not in the sense that has been hurting. A bundle can never contain a
*wrong* clip — the address it names cannot come to mean something else. It can only become
*incomplete*: the course later links a different object that the bundle does not have. So "refresh my
offline course" stops meaning "re-download in case something changed underneath me" and becomes
"fetch the addresses I am missing". Everything already held is provably still correct and is never
re-downloaded. That is a straight bandwidth win for every learner on a phone, and it removes the
entitlement-layer question of what a stale lease is entitled to — a lease covers a set of addresses,
and those addresses do not move.

**A shared store makes the bundle smaller before it makes it smarter.** Because an address carries no
course and no role, the same English sentence needed by a learner's two courses is one entry, not
two — and within a single course, a text appearing on both the known and target sides in the same
voice is downloaded once. 47,296 identities are already used by more than one role and 135,878 by
more than one course, so this is a real reduction in bytes over the wire, not a theoretical one. It
also removes a question nobody had a good answer for: what a bundle should do about a clip that two
courses disagree about. They cannot disagree; the address means one thing.

**No speed variants are ever bundled, for the same reason they are never stored.** A bundle carries
one object per address and the player applies Easy or Fast to it on the way to the ear. This is worth
saying explicitly here because it is where storing speed variants would have hurt most: a
speed-variant store would have doubled every offline download for a property that costs nothing to
apply at playback.

**The device cache keys on the hash.** `packages/player-vue/src/cache/AudioCache.ts` today keys its
IndexedDB store on audio id (`keyPath: 'id'`, store `ssi-audio-cache-v2`), which is precisely why a
relink that keeps the same id is inaudible on a device. Keyed on the hash, a relink is *automatically*
a cache miss and the new bytes are fetched, with no stamp bump and nothing to remember. **Eviction
becomes purely a size question** — an entry can never be *wrong*, only unused — so least-recently-used
is the whole policy, and the existing `by-last-accessed` index already supports it. The change is a
`DB_VERSION` bump and a key change; the two-namespace ephemeral/persistent split is orthogonal and
survives untouched.

Keying on the hash also makes the cache share across courses for free, which keying on audio id can
never do. Two courses needing the same sentence hold one entry between them by construction rather
than by coincidence of id, so a learner starting a second course finds part of its audio already on
the device.

---

## E. Generation infrastructure — adopt or replace, per piece

| piece | verdict |
|---|---|
| `services/shared/audio-pass-queue.cjs` + `audio_pass_requests` | **Adopt and promote.** It is already the single request corridor; it just is not the *only* one. Extend its row to carry the reason class (new text / voice change / gate failure) and make phase8 refuse work that has no request. **Add the store lookup at the front**: resolve `(language, normalised text, voice)` before queueing a render, so an identity that already exists becomes a link and never reaches TTS. This is where the 236,908 saving is actually banked, and it is also what makes a voice change cheap when the target voice is one another course already uses. |
| `services/phases/phase8-audio-v13.cjs` | **Adopt, narrow.** It stays the generation service; it stops being able to write a linkable row except through the gate + `audio_objects`. |
| `services/audio-veracity.cjs` | **Adopt unchanged.** Right method, right three-outcome shape, honest limits. |
| `services/audio-intelligence/*` | **Adopt and commit** — currently untracked. Build the missing `engine.cjs`. |
| `services/voice-engine/storage.cjs` | **Adopt, retarget.** Already the only S3 adapter and already applies the immutable header; it starts computing the hash and deriving the key from it. |
| `services/shared/audio-cache-control.cjs` | **Adopt unchanged.** Its promise finally becomes true. |
| `services/audio-processor.cjs` (mastering) | **Adopt, reorder.** Master before gating so the gates judge what the learner hears. |
| `services/voice-engine/synthesis-job.cjs` (human recordings) | **Keep separate for now.** It writes real recordings, not TTS; it should content-address its outputs but is out of scope for the TTS gates until they are calibrated for recorded audio. |
| The **35 files** that can currently insert into `course_audio` | **Replace with one writer.** They are the side doors. The foreign key closes them whether or not each one is individually rewritten — an un-migrated script simply starts failing its insert, loudly, which is the correct outcome. |
| `tools/revoice-clips.cjs`, `tools/repair-silent-clips.cjs` | **Keep as the reference pattern, and simplify both.** They already implement make-before-break correctly (§6b). Under content addressing `revoice-clips`' delete step becomes optional, and `repair-silent-clips`' *forced* delete-before-insert disappears outright: a same-voice re-render no longer collides on `unique_course_audio_per_voice`, because the row is updated to a new `content_hash` rather than reinserted. Its restore-from-memory recovery path exists only to survive that forced delete and can go with it. |
| The player's speed handling — `SimplePlayer.setPlaybackRate`, `ListeningOverlay`, `algorithm_config.{easy,fast}_mode.playback_speed` | **Adopt unchanged; it is already the right layer.** Speed is applied per clip at playback and configured in DB rows, which is exactly what keeps speed variants out of the store. The only change this design *asks* for is optional and is a config question, not a code one: `playback_speed` is currently per mode, and a per-role rate would be a new field on rows that already exist. |

---

## F. Migration — incremental, and honest about stalling

**Nothing is deleted. Not one row, not one object.** The 107 superseded `deu_for_eng` rows and their
files stay exactly where they are. Deletion of generated assets needs its own plan and Tom's
approval; §G mentions it once as a future option and does nothing about it.

### How a migrated row is told from an unmigrated one

`course_audio.content_hash IS NOT NULL`. That is the whole test. One nullable column, one meaning.

### How the serve path handles both without branching everywhere

One branch, in one place: `api/_utils/audioAccess.ts` already is the single point that turns an
audio id into an object. It gains four lines — if the row has a `content_hash`, serve from the
hash-derived key; otherwise serve from `s3_key` as today. Every other call site is untouched. A
course is fully migrated when it has zero rows with a null hash; that is one query, and it should be
on the dashboard.

### The steps

**Step 0 — already done, tonight.** German's 57 slots were relinked to verified replacements, and
each was checked by fetching the bytes the live app serves and comparing them against the intended
clip. That verification method *is* step 7 of the new pipeline, done by hand. The path starts from a
course that has just been proven correct at the delivery end.

**Step 1 — hash what is already there, read-only.** Walk the estate, fetch each object, compute its
hash, write `audio_objects` rows and back-fill `course_audio.content_hash`. **No bytes move. No key
changes. No links change.** This alone is worth doing on its own merits: it makes duplication visible
(2,532,679 rows over 2,336,017 keys — and true byte-level duplication will be higher than key-level),
and it makes any future in-place rewrite *detectable* by re-hashing, which nothing can do today.

Step 1 is also where deduplication becomes *visible* without yet being *applied*, and the distinction
matters. Back-filling `audio_objects` will find 236,908 identities holding more than one object. None
of them is wrong and none is deleted: one is marked current for that identity and the rest get
`superseded_at`, which here means only "still valid, still served, no longer the answer to a lookup".
**Rows are not relinked.** A row pointing at a duplicate object keeps pointing at it and keeps
playing exactly the bytes it plays today. Deduplication is a rule about renders that have not
happened yet, not a bulk rewrite of links that already work — which is what keeps this step read-only
in every sense that matters.

**Step 2 — new audio is born content-addressed.** Turn the new pipeline on for generation only.
Every clip rendered from that day forward gets a hash address and a gate verdict. The estate begins
converging without any bulk operation at all.

This is also where dedup starts paying, and its completeness depends on step 1's coverage in a way
worth stating plainly: the lookup can only find what has been hashed. A language whose back-fill has
not run yet will miss, render a duplicate, and admit it — correct audio, wasted money. So **a stalled
step 1 costs redundant renders and never wrong clips**, and the two steps can be sequenced per
language rather than estate-wide: hash a language, then let its courses render against a store that
knows what it already has.

**Step 3 — courses migrate as they are touched.** A course that gets an audio pass, a voice swap or a
repair gets its objects copied to hash keys as part of that work, which is work already being done
and paid for. German is first, because German is where the pain was. Nothing is scheduled; the
backlog drains through normal activity.

**Step 4 — the tail, whenever.** Whatever has not been touched in a year gets a bulk copy pass, or
does not. See below.

### The real costs, stated

- **Rehashing.** ~2.5M objects to fetch and hash. Same-region S3 reads: the compute is trivial, the
  transfer is the cost, and it is a one-off. Comfortably parallel, fully resumable — a hash is
  deterministic, so a restart re-does only what it lost.
- **Storage duplication during the overlap.** Copying an object to its hash key while the old key
  stays means paying twice for the migrated portion until we choose to stop. On the current estate
  that is a percent-scale line item, and the answer to it is the alias below.
- **Can existing S3 keys be kept as aliases?** Yes, and this is the cheap route: instead of copying,
  record the legacy key in `audio_objects` and let the serve path resolve a hash to whichever key
  holds those bytes. Then step 1 is pure metadata, storage does not double at all, and objects only
  move to hash keys when they are next rewritten — which under this design means never. **This is my
  recommendation**: alias first, copy lazily, never bulk-copy. It also means a stalled migration
  costs nothing.
- **What breaks if it stalls half-done for months.** Very little, by design, and this is the test the
  plan has to pass. Unmigrated rows behave exactly as they do today — including remaining exposed to
  the in-place-rewrite bug, which is the honest cost of not finishing. Migrated rows are immune.
  There is no flag day, no dual-write, no reconciliation job, and no state where a row is half
  migrated: `content_hash` is either there or it is not. The one thing that must **not** stall is
  step 2 — once new audio is content-addressed, the problem stops growing, and everything after that
  is cleanup that can wait indefinitely.
- **What a half-done migration does to sharing.** Nothing bad, and this is the property to check
  hardest, because a dedup scheme that half-applies is exactly the kind of thing that corrupts an
  estate. It cannot here, for one reason: **sharing is only ever consulted before a render, never
  imposed on a link.** An unmigrated course renders its own copy exactly as it does today; a migrated
  one finds the existing object and links it. The two behaviours differ in cost, never in what a
  learner hears. There is no state in which a course is "partly deduplicated" and no reconciliation
  to run if it stops halfway — the worst outcome of stalling forever is that the estate keeps the
  236,908 duplicate objects it already has.
- **The one genuinely new risk, named.** A shared object means a bad render can now reach more than
  one course. That is the honest price of sharing and it is not zero. Two things hold it down: the
  gates run *before* admission, so an object that reaches any course has passed them, and a fix is a
  new object with a new address, so repairing a shared clip repairs it everywhere it is used in one
  operation rather than 133. The blast radius grows and the repair radius grows with it, which is a
  trade worth taking — but it is a trade, and pretending otherwise would be the kind of oversell this
  document is trying to avoid.

---

## G. Mentioned once, and left alone

Under content addressing an object with no row pointing at it is harmless — it costs storage and
nothing else. A future, gated garbage collection could reclaim it. **Not proposed, not planned,
needs its own plan and Tom's approval.** This paragraph exists so nobody later claims it was implied.

---

## H. Gaps and open questions

- **Pod / human-recorded audio scope** — stated open, not silently decided (§C).
- **Syllable counters exist for English and German only**; every other language is advisory until
  fitted (§C).
- **Cohort-vs-model duration baseline** — I measured both on one phrase and one voice pair. The
  cohort's advantage is large and clear, but it is one measurement, not a fitted operating point. A
  proper sweep across a course is needed before the σ is treated as a ruling.
- **`services/audio-intelligence/` is untracked** — it exists in this working tree only. If that
  working tree is lost, so is it. Committing it is the single highest-value small action available
  right now and it is not mine to do on someone else's behalf without saying so.
- **The 3 August in-place rewrites have never been enumerated estate-wide.** We know 10 of Tom's 20
  played clips and 155 of 205 `deu` seed-1–5 revision-1 clips were rewritten. The equivalent number
  for the other 132 courses is unknown, and step 1's hashing pass is what would tell us.
- **Voice in the logical identity is a judgement call, not a ruling.** The estate argues it hard —
  658,984 texts against 13,275 — but Tom's constraint was stated as "identical language and text",
  and this design has read a third column into it. If he means voice out, the consequence is a
  659,000-slot revoice and it should be his sentence, not an inference from mine.
- **Byte-level duplication is unmeasured.** Every dedup figure here is key-level. Two separate renders
  of the same text sometimes produce identical bytes, and no query can see that until objects are
  hashed. The 236,908 is therefore a floor and the real number is unknown — deliberately not
  estimated, because a guess would read as a measurement next to the counts above.
- **The ~197,000 voice-drift figure is an upper bound, not a measurement.** It assumes two voices per
  text is the legitimate shape, which is wrong for any language that is known in one course and
  target in another. Separating drift from legitimate multi-voice needs the per-course-side voice
  declaration that step 2 creates, and cannot be done before it.
- **Recorded audio has no admission path yet** (§C). The foreign key makes this a build-blocker rather
  than a nicety, whichever way Tom answers the pod scope question.
- **Per-role playback speed does not exist.** `playback_speed` is per mode and both modes sit at 1.0.
  The design places speed firmly in the player and off the store; what rate each side should run at is
  untouched by that and remains a taste call, against a standing ruling that slowed speech teaches a
  register nobody speaks.
