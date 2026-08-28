# Decisions journal

One entry per decision that a later reader would otherwise have to reverse-engineer
from the code. Newest first.

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
