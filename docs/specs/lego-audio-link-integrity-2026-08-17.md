# course_legos gets the same audio rule — and the bleed has a name

**2026-08-17 · Kai's queued follow-on to the audio-link unification · branch `feat/lego-audio-link-integrity-2026-08-17`**

Three content tables hold a learner's audio: `course_seeds`, `course_practice_phrases`
and `course_legos`. Earlier today the first two were put on one safe rule. This is
the third and last — and it is the table the 1,034-slot bleed actually came from.

---

## The rule, now on all three

On a text edit:

1. **The clip still speaks the new words** (whitespace, casing, trailing
   punctuation only) → **keep it**.
2. **We already own a clip for the new text in the same voice and the same
   language** → **re-point at it, and write the move down**.
3. **Otherwise** → **NULL the link, and write the drop down** — keeping the clip
   id, the voice, and the words that clip actually speaks.

Null-and-report, never a silent relink. Nothing in any branch deletes or modifies
a `course_audio` row. No TTS is generated, requested or implied.

---

## What the briefing got wrong, and what the database said instead

The brief for this work said `course_legos` "nulls `presentation_audio_id` and
re-resolves its other three columns". Every claim below was read out of the
running database on 2026-08-17, not out of a document.

**1. The live trigger re-resolves all four columns, presentation included.** It
does not null it. It assigns whatever a voice-blind lookup returns:

```sql
NEW.presentation_audio_id :=
  audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text;
```

**2. It only *looks* like nulling, because that lookup can never hit.** A lego
presentation clip does not speak the lego's target text. It speaks a composed
introduction that *quotes* it — for a lego whose `target_text` is `now`, the clip
says:

> `ඉංග්‍රීසිෙන්. 'දැන්'. 'මමට දැන් කතා කරන්න ඕනේ' ඉතින්. :`

Measured across the whole estate: of **72,062** legos with a presentation link,
the number whose clip text normalises to the row's `target_text` is **zero**. Not
few — zero. So the lookup returns NULL every time and the assignment severs the
column as a side effect. **Including on a trailing-space edit.**

**3. That severing is permanent and unrecorded.** `link_audio_to_content` — the
trigger that refills NULL slots when audio lands — matches presentation on the
same never-true predicate (`normalize_text(target_text) = NEW.text_normalized`).
So a NULLed lego presentation link is never refilled by anything, by any route,
ever. The clip survives in `course_audio`, fully paid for, permanently
unreachable. Nothing anywhere writes down that it happened.

**That is the bleed.** An ordinary lego text edit silently and irreversibly
severs a presentation slot, and the only visible symptom is a learner hearing
nothing where an introduction should be.

**4. `course_legos.presentation_audio_id` is TEXT, not uuid, and carries no
foreign key** (`course_practice_phrases`' is uuid). Today all 72,062 values are
uuid-shaped and none dangles — verified, not assumed — but nothing in the schema
enforces either property.

And the hazard the other two migrations removed is here too:
`audio_id_for_text()` constrains `course_code`, `role`, `s3_key` and
`text_normalized`. It does **not** constrain `voice_id` and it does **not**
constrain `language`. An ordinary lego text edit can land a slot on a clip spoken
by a different voice, with no NULL and no alarm.

---

## Reproduced on live machinery, before anything was applied

The canary's controls run against the **current** trigger, inside a transaction,
before the migration is applied:

| Control | Result |
|---|---|
| `BASELINE` — a lego text edit moves the slot to another voice | **Ryan → Sonia, no NULL, no alarm** |
| `BASELINE` — and nothing is written down about it | confirmed: zero report rows |
| `BASELINEPRES` — a **trailing-space** edit destroys the presentation link | confirmed: severed |
| `BASELINEPRES` — the clip itself survives | confirmed: alive in `course_audio`, unreachable |
| `BASELINEPRES` — `link_audio_to_content` could refill it | **no** — its predicate cannot hold for an intro |
| `CONTROL` — `audio_id_for_text` *would* still have swapped it after the migration | confirmed |

The defect is not inferred. It is reproduced, then fixed, then reproduced again
as a control on the same fixtures.

---

## What changes for each column

`known_audio_id`, `target1_audio_id`, `target2_audio_id` behave exactly as they
now do on the other two tables.

**`presentation_audio_id` is in scope here, unlike the phrase migration which
excluded it.** The phrase migration's two reasons for excluding it were (a) no
evidence the scope should widen and (b) 17,480 phrase rows already dangling on
that column. Neither holds for `course_legos`: the scope is not being widened at
all — the live trigger already assigns this column on every text edit — and
nothing dangles. What changes is only the honesty:

- a **cosmetic** edit now **keeps** the presentation link instead of destroying
  it. This is new protection. It is the same cosmetic-keep rule the other three
  columns get; it just has to be expressed against the **row's** text rather than
  the clip's, because a presentation clip never speaks the row's text and so the
  clip-text test can never be the thing that saves it.
- a **genuine** edit still nulls the link — as it does today — but now writes a
  `content_audio_link_drops` row naming the clip, its voice and its words. The
  severed slot becomes countable, and the link becomes restorable by hand.

Two schema realities are handled because nothing forbids them:

- a presentation value that is **not uuid-shaped** is recorded in a new nullable
  `old_link_raw` column and dropped — never allowed to raise. Raising would
  **block a legitimate edit**, which is worse than the bug being fixed.
- `course_legos.known_text` is **NULLABLE** (521 rows are NULL today), so every
  changed-test is `IS DISTINCT FROM`, not `=`.

---

## What this does NOT fix — recorded, not papered over

- **A dropped presentation slot still cannot be refilled automatically.**
  `link_audio_to_content` matches it on the same never-true predicate. This
  migration makes every drop *recorded* and therefore reversible by hand; it does
  not touch that trigger, which sits on a different table with a much larger
  blast radius. **This is the next open item on this thread.**
- **31 known, 103 target1 and 103 target2 lego links are already stale today** —
  the clip does not speak the row's text. Under the new rule a cosmetic edit to
  one of those rows drops the link rather than re-resolving it. That is the
  ruling working as intended — the link already pointed at the wrong words, and a
  recorded NULL is more honest than a silent re-resolve to a possibly-different
  voice. Counted here so the drops are expected, not a surprise.
- **`course_legos_pull_duration`** sorts alphabetically ahead of this trigger, so
  `target1_duration_ms` / `target2_duration_ms` are not refreshed when this
  function moves or nulls a target link. Pre-existing, identical on
  `course_practice_phrases`, not changed here.

---

## The canary

`database/canary/canary_lego_audio_link_integrity.cjs` — applies the migration
inside one transaction, replays the real behaviour against it, and commits only
if every assertion is green. Anything red, or no `--commit`, and the database
never saw it.

**55/55 green.** Checks: `BASELINE`, `BASELINEPRES`, `CONTROL`, `NOSWAP`,
`SAMEVOICE`, `COSMETIC`, `COSMETICPRES`, `PRESDROP`, `PRESRAW`, `PRESDANGLE`,
`STALENORM`, `TARGET`, `NULLKNOWN`, `NULLSTAYS`, `NOTEXT`, `NAME`, `ROWID`,
`NOAUDIODEL`, `LIVEPATHS`.

The three fixture lessons from today's applies are baked in:

- `course_legos.id` **is** a uuid with a `gen_random_uuid()` default — verified
  against `information_schema`, never supplied by the fixture.
- every NOT NULL column with no default (`course_code`, `seed_number`,
  `lego_index`, `type`, `is_new`, `target_text`) is populated.
- **the canary restores the real production lego it dirties, and asserts the
  restore** — on the text *and* on all four links. That assertion is what both
  prior canaries lacked, which is how a real trailing space reached
  `eng_for_sin` seed 1 and `eng_for_sin:S0001L01B01` on `--commit`.

It also added a lock guard: `DROP`/`CREATE TRIGGER` takes ACCESS EXCLUSIVE on
`course_legos` and holds it to COMMIT, so a run started against a busy table
would queue behind the content passes *and* make every one of their writes queue
behind it. `lock_timeout = 15s` makes it fail fast and be re-run instead.

**One defect the canary found in itself.** It asserted `content_audio_link_drops`
held no row against any real course. That table is *not* empty — the seed and
phrase triggers went live earlier today and other agents' real edits land in it
while the canary runs. Every drops read is now scoped to a high-water id taken
before anything is applied. An unscoped assertion fails on other people's rows
and says nothing about our own.

---

## Drops recorded since the seed and phrase triggers went live

First row `14:37:48Z`, measured at `14:47:05Z` — the first ten minutes of the new
rule being live on two tables:

| Table | Course | Reason | Rows |
|---|---|---|---:|
| `course_practice_phrases` | `eng_for_sin` | `nulled-no-same-voice-clip-for-new-text` | 61 |
| `course_seeds` | `eng_for_sin` | `nulled-no-same-voice-clip-for-new-text` | 11 |
| `course_practice_phrases` | `ara_lb_for_eng` | `relinked-same-voice` | 4 |
| `course_practice_phrases` | `ara_lb_for_eng` | `nulled-no-same-voice-clip-for-new-text` | 2 |
| | | **total** | **78** |

The four `relinked-same-voice` rows are the rule doing the thing it exists to do:
an `ara_lb_for_eng` known slot moved from `yaskot` to `be quiet`, staying on
`azure_en-GB-SoniaNeural`, **and the move was written down**. Under the old rule
that same edit could have landed on a different voice with nothing recorded.

The `eng_for_sin` nulls are a content pass repairing seed 380 — `I asked what` →
`I asked her what`. Genuine text changes with no same-voice clip for the new
words, so they are honest holes that every missing-audio sweep will now find,
each with the old clip id kept so it is reversible.

Note the voice ids: `bedd6226` and `xai_bedd6226` both appear. `audio_canon_voice`
folds them onto one key, so same-voice matching is not defeated by that tagging
artefact.

---

## Can a content-table text edit still silently swap or destroy an audio link?

| Table | Silent voice swap? | Silent destruction? |
|---|---|---|
| `course_seeds` | **No** — same-voice-or-null, every move recorded | **No** |
| `course_practice_phrases` | **No** for `known`/`target1`/`target2` | `presentation_audio_id` is **still untouched by the trigger** — it is never invalidated, so a phrase text edit leaves it pointing at the clip for the old words |
| `course_legos` | **No**, all four columns | **No** — but a dropped presentation link cannot be *refilled* automatically |

The one remaining hole in the estate is
`course_practice_phrases.presentation_audio_id`: not a swap and not a
destruction, but a **stale** link a text edit never invalidates. That is a
different defect from the one this thread closes, and it is deliberately still
open — 20260806 declined to widen the scope for want of evidence.

**A correction, because it was measured rather than repeated.** The phrase
migration's header justifies excluding that column partly on "17,480 of its rows
already point at a `course_audio` row that no longer exists". On live data today
that is **not true**: of 56,671 phrase rows with a presentation link, **zero**
dangle. (Whatever was true when 20260806 recorded it has since been repaired, or
the figure was wrong.) The exclusion still stands on its other ground — no
evidence the scope should widen — but the dangling argument for it is dead, and
anyone reconsidering that column should not rely on it. Also measured: of those
56,671, the number whose clip speaks the row's `target_text` is **zero**, exactly
as for legos — so phrase presentation clips are composed introductions too, and
whoever picks that column up next inherits the same design problem this migration
solved for legos.
