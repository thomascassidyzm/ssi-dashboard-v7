# Welsh pods: the cast is Aran and Catrin, and now the data says so

**2026-08-11.** Acting on Tom's ruling: the Welsh PodLab cast listed five target-voice
readers; Aran's rule for this course is a two-hander, and only Aran has recorded. Cut it
to two.

---

## What was actually wrong

The same casting was written down in two places, and they disagreed.

| | where | what it said |
|---|---|---|
| **The cast of record** | `courses.voice_config.podCast` | 22 characters, each named to a real reader: **Aran** (13 characters) and **Catrin** (9). Two people. Complete — no character uncast. |
| **What PodLab showed and the gate fingerprinted** | `listening_pods.speakers` | five placeholder generation ids — `HUMAN_F1`, `HUMAN_F2`, `HUMAN_F3`, `HUMAN_M1`, `HUMAN_M2` — left over from the original course import. |

So PodLab flagged, correctly, "5 distinct target voices — Aran's rule is a two-hander."
It was reading the stale map. The three extra readers were never people: they are import
placeholders, and **nothing has ever been recorded against any of the five** — every one
of the 87 recorded target clips on `cym_n_for_eng:pod-0-unrecorded` is Aran's, under
`human_aran_cym_n` (65) and its alias `human_aran_cym_n_2` (22).

The second voice needed no guess. Catrin (`catrinlliar@gmail.com`,
`human_catrinlliar_cym_n` / `human_catrinlliar_cym_s`) is the designated partner, already
named against all nine female characters in the cast of record, with zero recorded so far.

## What changed

`listening_pods.speakers` on all four Welsh pods now restates each character's gender and
both track voices from `podCast`. Two voices per pod, one male, one female:

| pod | before | after |
|---|---|---|
| `cym_n_for_eng:pod-0` | 5 placeholder ids | `human_aran_cym_n` (13 chars) + `human_catrinlliar_cym_n` (9) |
| `cym_n_for_eng:pod-0-unrecorded` | 5 placeholder ids | same |
| `cym_s_for_eng:pod-0` | 5 placeholder ids | `human_aran_cym_s` (13) + `human_catrinlliar_cym_s` (9) |
| `cym_s_for_eng:pod-0-unrecorded` | 5 placeholder ids | same |

Cast fingerprints: `cym_n_for_eng` `0fdbb8bf958e0e67` → `52a0f2f517865ee8`;
`cym_s_for_eng` `7237e79cd1a10ac1` → `0f1515bab1a47255`. Neither course had an approval on
record, so nothing was invalidated — the next approval in PodLab is the first.

The characters did not change. A scene can have 22 characters and a cast of two; that was
never the problem.

## Verified

Re-running PodLab's own `castFlags` logic against the live rows, per pod:

- **2 distinct target voices** — the two-hander flag is clear on all four pods.
- **Genders m + f** — the gender flag is clear.
- **0 speaker labels resolve to no target voice** — nothing has become unrenderable.
- **Line share 62% Catrin / 38% Aran** on the 232-line pod — under the 70% skew threshold,
  so the share flag stays `ok`.
- **Audio untouched**: 87 target links and 23 known links on `cym_n_for_eng:pod-0-unrecorded`
  are exactly as before, all `origin='human'`. The alignment moved the cast *towards* the
  ids Aran's recordings already carry, so his takes now resolve against the cast instead
  of sitting under voices nobody was cast to.

## How, and how to undo it

Direct data update, no migration: `listening_pods.speakers` is a jsonb column, and the
tool is `tools/pod-cast-align-to-people.cjs` (dry-run by default, `--apply` to write,
re-reads each row and skips it if it drifted since the run started). It writes that column
and nothing else — no sentence row, no audio link, no deletion.

The full before-state of every pod is in `cast-align-applied-log.json` beside this file,
so the change is reversible by writing `speakers_before` back. Nothing here is
irreversible: no audio was generated, moved or deleted.
