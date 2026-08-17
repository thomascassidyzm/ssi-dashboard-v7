# A-108 worker brief — T-V register + gender + annotations on staged pod translations

Tom ruled A-108 on 2026-08-14 ("yes confirmed"). Apply his rules to STAGED DRAFT pod
translations only. Verbatim rules:

1. **NO annotations or explanations in any learner-facing line, EVER** — no slash forms
   like `cansado/a`, no bracketed glosses, no parentheticals.
2. **Gender agreement matches THE SPEAKER of the line.** If the voice saying the line is
   a woman, `cansada`, not `cansado/a`.
3. **T-V register: `tu` (informal) BY DEFAULT; polite/V form ONLY where CONTEXT genuinely
   demands it (stranger/service situations).**

Rule 3's exception clause is the point Tom confirmed: **polite-for-strangers is correct.**
Do not flatten service dialogue to informal.

## Scene canon (all pods share it — 22 scenes)

| Scenes | Cast | Register |
|---|---|---|
| 2, 3, 7, 8, 9, 10, 11, 12, 13, 14 | Barista, Bartender, Waiter, Receptionist, Pharmacist, Assistant, Driver, Local/Tourist, Passenger, fellow Customers | **SERVICE / STRANGER → V form** |
| 1, 4, 5, 6, 22 | Neighbour, Friend, Anna/James, Sarah | **PEER → T form** |
| 15–21 | Learner + Narrator (solo practice lines) | **Judge per line.** Most are general statements → T. If the line is clearly addressed to a stranger/service person, V. |

Narrator lines are never addressed to anyone — leave register alone.

## Resolving speaker gender (rule 2)

`listening_pods.speakers` is a jsonb map keyed by speaker role. Each entry has `gender`
and a `target` voice. **The `gender` field is stale in 8 courses (value `'n'`) — use the
TARGET VOICE, which is what Tom's rule keys on ("the voice saying the line").**

Empirically settled across 120 explicitly-gendered cast entries, zero male assignments:
`eve`, `ara`, and `1b12d5daee6b` (Aleksandra) are **female**. Every `gender:'n'` Learner
in the estate is cast with one of these, so **those Learner lines take FEMININE agreement.**

Check your own course's cast before writing; do not assume.

## Sibling variants — hard rule (Tom, standing)

`spa_mx ≠ spa`, `deu_at ≠ deu`, `fra_ca ≠ fra`, `por_br ≠ por`, `ara_eg`/`ara_sy` ≠ `ara`.
These are SEPARATE LANGUAGES. Fix register **in place using that variant's own norms** —
Brazilian `você` is the ordinary informal 2nd person, NOT a polite form; Quebec French has
its own `tu`/`vous` boundary. **NEVER copy a parent course's text across.**

## Scope and write path

- Touch **only** rows with `target_text_draft = true`. Nothing else, ever.
- **Preserve `target_text_draft = true`** on every row you write. Do NOT use the
  `PATCH /sentence/:sentenceId` route — that clears the draft flag, which falsely marks
  the line as human-proofread. Write via direct SQL.
- DB access: `set -a && . ./.env.psql &&
  set +a && ~/.local/pg17/bin/psql "$DATABASE_URL"`
- Dry-run first. Assert the before-state per row and abort on drift. Log every row
  (id, before, after, reason) to `docs/a108/<yourlangs>-applied-log.json`.
- Re-query after writing to verify. Counts must reconcile exactly with your log.
- Generate NO audio. These are text-only edits on unrendered drafts.

## Report back

Per language: drafts examined, lines changed for register, lines changed for gender,
lines changed for annotations, lines left alone and why. Name explicitly any line you
could not resolve, and any language where you are not confident enough to judge — an
honest gap is worth more than a guess. Do not pad counts.
