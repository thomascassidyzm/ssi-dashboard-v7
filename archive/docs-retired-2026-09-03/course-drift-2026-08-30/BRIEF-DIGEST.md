# Digest — the ruling, the job, the rails (read this, not the whole estate)

**Tom's ruling (2026-08-30):** six courses teach one form in a lesson and drill the other.
Fix them by **making the DRILLS match the TAUGHT LEGO**. The teaching is authoritative; the
drills bend to it, never the reverse.

**This is PROPOSE ONLY.** Nothing is applied. No DB writes. No TTS. No commits. No branch
switching. You write one markdown file and stop.

**Vocabulary.** A *lego* (`course_legos`) is a lesson — the unit that introduces a bit of
language, with `known_text` (the prompt language) and `target_text` (the language being
learnt). A *drill* is a practice phrase (`course_practice_phrases`), role `build` or `use`,
joined to its lego by `(course_code, seed_number, lego_index)` — the `lego_id` column on
phrases is mostly NULL, do not join on it. Rows with `phrase_role='component'` are literal
tiling glosses and are OUT OF SCOPE.

**The rails that bind your rewrites.**
- **ZUT**: one known-side prompt maps to exactly one target form, course-wide. Your rewrite
  must not create a second target for a known string that already has one.
- **Known side is a controlled language**: you are editing the TARGET side only. Do not touch
  `known_text` unless you are flagging it as the real defect.
- **No parentheses, ever. Zero explanation** — no annotations in learner-facing text.
- **Minimal edit**: change only what the drift requires. Keep everything else byte-identical.
- **If in doubt, say so** — a flagged judgement call is worth more than a confident guess.

**The source finding** is `docs/optional-feature-consistency-2026-08-28.md` (survey only,
49 courses). Read it only if you need the framing; your data is handed to you.

**Your output file** — markdown, phone-readable, at the path named in your brief:
1. A one-paragraph headline: how many drill lines you propose to change, and how many you
   are refusing to change and why.
2. A table of EVERY proposed rewrite, one row per drill line: phrase id, role, the taught
   lego (id + known + target), the drill's known text, **BEFORE** target, **AFTER** target.
   Every one. Not a sample. If the list is long, that is the honest answer — say the number
   in the headline and give the whole list anyway.
3. A separate section for lines you are NOT proposing to change, with the reason, one line
   each (e.g. the explicit pronoun is grammatically required here; the contraction would be
   unnatural; the lesson label looks like the real defect).
4. A short "what this pass is really doing" paragraph in plain words Tom can read cold.

**Scratch files go in $CS_SCRATCH** (echo it), never bare /tmp.

**DB access if you need it**: `node` + the `pg` package from the repo root, reading
`DATABASE_URL` out of `.env.psql`. There is a ready helper at
`scripts/drift-proposal/q.cjs` — `const q=require('./scripts/drift-proposal/q.cjs'); q(sql,params)`.
READ-ONLY. Any INSERT/UPDATE/DELETE is a hard breach of this brief.
