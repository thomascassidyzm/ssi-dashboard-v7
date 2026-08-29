# Decisions journal

One entry per decision that a later reader would otherwise have to reverse-engineer
from the code. Newest first.

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
