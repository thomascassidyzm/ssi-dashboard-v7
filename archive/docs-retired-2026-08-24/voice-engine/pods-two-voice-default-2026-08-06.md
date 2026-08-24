# Pods: two voices by default — what was actually wrong, and what changed

**2026-08-06.** Acting on Tom's voice note after looking at the Welsh pods in Popty.

---

## The short version

**The cast data was already right.** Both Welsh courses already held exactly two human
voices — Aran and Catrin — before I touched anything. The 2026-07-17 two-voice ruling
worked.

**What Tom was looking at was a display problem.** Popty was rendering the *characters*
in the script as if they were the *cast*. The pod page opened with a 22-row grid headed
"Speaker voice mapping", one row per character, each against a raw generation voice id
(`HUMAN_F1`, `HUMAN_F2`, `HUMAN_F3`, `HUMAN_M1`, `HUMAN_M2`). Across the two Welsh pods
that is 44 rows of what looks like casting. The pod cards said "22 speakers".

That is the "massive overkill" — a writing fact (a scene can have as many characters as
it likes) dressed up as a casting fact (which is two people).

**And the model had the opposite problem.** The API hard-rejected any cast that wasn't
*exactly* two people. That satisfied half of Tom's ruling and contradicted the other
half — "if you want to try it with three or four voices […] fantastic, we can do that".

---

## Before and after, in numbers

| | cym_n_for_eng | cym_s_for_eng |
|---|---|---|
| Characters in the pod-0 script | 22 | 22 |
| **Human voices in the cast — before** | **2** (Aran, Catrin) | **2** (Aran, Catrin) |
| **Human voices in the cast — after** | **2** (Aran, Catrin) | **2** (Aran, Catrin) |
| Voice ids shown on the pod page — before | 5 generation ids across 22 open rows | 5 generation ids across 22 open rows |
| Voice ids shown on the pod page — after | 2 people, characters one click away | 2 people, characters one click away |
| Pod card wording | "22 speakers" → "22 characters" | "22 speakers" → "22 characters" |

The voice count did not need to change because it was never wrong. **No Welsh data was
rewritten and no audio was generated.**

---

## What a Welsh recorder now sees

Verified by building the real recording plan against the live database, for each voice on
each course — this is the actual queue the autocue serves, not an inspection of the data.

**Aran** (male voice, `aran@hey.com`) — one coherent male queue:

- `cym_n_for_eng`: **318 items**, 27 already recorded, 291 remaining. Plays 13 characters
  (Neighbour, Friend, James, Narrator, Customer 2, Customer 3, Waiter, Customer, Guest,
  Pharmacist, Tourist, Local, Driver) **plus the bilingual guide lines**.
- `cym_s_for_eng`: **87 items**, 0 recorded. The same 13 characters, no guide lines.

**Catrin** (female voice, `catrinlliar@gmail.com`) — one coherent female queue:

- `cym_n_for_eng`: **144 items**, 0 recorded. Plays 9 characters (Sarah, Passenger,
  Barista, Anna, Customer 1, Bartender, Assistant, Receptionist, Learner).
- `cym_s_for_eng`: **375 items**, 0 recorded. The same 9 characters **plus the bilingual
  guide lines**.

Both are registered and can reach their queues: Catrin is a `recorder` holding both Welsh
courses; Aran is an `admin` with all-course access, and admins can use the record room
too. Each resolves their per-course voice by **email match against the cast**, so Catrin
correctly gets `human_catrinlliar_cym_s` on the southern course rather than her northern
id — the thing a single `dashboard_users.voice_id` column would have got wrong.

---

## What changed in the model

- **Two voices is the default.** `GET /cast` now serves a `castDefaults` block — two rows,
  one female, one male, prefilled from the roster where we know who's there. A leader who
  configures nothing lands on the right shape and never meets an N-voice concept.
- **Three to five is an opt-in upgrade.** The hard "exactly two" rejection is gone,
  replaced by one rule at every size: 2–5 people, always including at least one male and
  one female voice. That last part is not ceremony — with only those voices covering every
  character, a cast missing a gender leaves characters with nobody to read them.
- **The opt-in is deliberately quiet.** A dotted-underline "Add another voice" that only
  appears once both default voices are in, reading "only if you've got another recorder.
  Two voices records a whole course." No mode switch, no wizard, no setting.
- **A deliberate opt-in now survives.** `PUT /cast` records `voice_config.podCastVoices`,
  so a three- or four-voice cast is no longer collapsed back to two on the next page load.
  Casts without that key — every existing course — collapse exactly as they always did.

Verified end-to-end against the live Welsh data: two voices, three voices and four voices
all solve cleanly and cast all 22 characters; one voice, six voices and two-of-the-same-
gender are refused in leader language.

---

## Why nothing was re-saved for Welsh

Aran recorded **27 takes** already sitting on `cym_n_for_eng`. Re-solving a cast that is
already correct would load-balance the characters differently between the two voices for
no gain, and any character that moved voices would take its recorded lines out of the
queue they belong to. Make-before-break says don't. The cast is right; it was left alone.

---

## Two things worth your call

Neither is a defect and neither was actioned.

1. **The bilingual guide is Aran on north and Catrin on south.** That is what makes the
   queues so lopsided — 231 guide items land on whoever holds it, so Aran carries 318 vs
   Catrin's 144 on north, and Catrin carries 375 vs Aran's 87 on south. It balances out
   across the two courses, but if you'd rather the same person guided both, that's a
   re-save worth doing deliberately.

2. **The wider sweep.** Every other course with pods — 58 of them — has **no cast
   configured at all** (0 cast entries), while carrying generation colouring for 22–50
   characters each. They will all now get the two-voice default the moment anyone opens
   their cast panel, which is the right outcome. No collapse is needed anywhere, because
   there is no multi-voice cast anywhere to collapse. `zzz_test_for_eng` holds a 2-voice
   test cast. Welsh is the only course with a real human cast.

---

## Explicit gaps

- `psql` is not installed on this machine, so all live reads went through the repo's own
  Supabase service-role client rather than direct SQL. Everything reported here is a live
  read; none of it is from a document.
- `services/voice-engine/__tests__/pods-origin-guard.test.mjs` has **3 failing tests**.
  They are pre-existing and unrelated to this work — verified by stashing my changes and
  re-running, which reproduces the same 3 failures. I did not fix them; they are in the
  phase8 audio path, not the casting path.
- The recorder experience was verified by building the real recording plan through the
  same code the API serves, and by confirming the routing guard and the email-to-voice
  resolution. I did not log in as Aran or Catrin in a browser.
