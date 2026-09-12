# ita_for_eng — voice config repointed to Azure, and seed 558's subjunctive

*2026-09-01. Two fixes Kai approved: the course's voice configuration, which named a
retired provider and blocked all audio work; and `S0558L01U05`, the last instance of
`sapere che` + subjunctive left after this morning's boundary repair at 387/615/617.*

---

## Fix 1 — the voice configuration

`courses.voice_config` for `ita_for_eng` named **xAI** on all four roles. xAI was
retired for new renders on 2026-08-27, so the provider policy refused the course
outright: every role of `/regenerate-role`, and by the same gate `/regenerate-phrase`
and `/regenerate-lego`, failed with

> `[provider-policy] the configured voice "ara" (provider "xai") cannot be carried onto azure for ita_for_eng/target1. Re-cast this role's voice in voice_config.`

Meanwhile the audio the course actually holds is Azure. Counting only clips that are
**linked** from the content tables (seeds, LEGOs, practice phrases):

| Role | linked clips on the config's provider | linked clips on Azure |
|---|---|---|
| known | 1,111 on xAI / clone voices | 14,480 Azure, of which 14,479 `azure_en-GB-SoniaNeural` |
| target1 | 961 on xAI / clone voices | 14,597 `it-IT-ElsaNeural` (prefixed + bare spellings) |
| target2 | 924 on xAI | 14,634 Azure, of which 14,625 `it-IT-BenignoNeural` |
| presentation | 29 on xAI | 2,411 `azure_en-GB-SoniaNeural` |

So this was a **repoint to what the course already is**, not a migration.

### Before → after, per role

| Role | was | is now |
|---|---|---|
| known | xAI — Eve (`eve`), language `en` | **Azure — Sonia (`en-GB-SoniaNeural`), `en-GB`** |
| target1 | xAI — Ara (`ara`), language `it` | **Azure — Elsa (`it-IT-ElsaNeural`), `it-IT`** |
| target2 | xAI — Leo (`leo`), language `it` | **Azure — Benigno (`it-IT-BenignoNeural`), `it-IT`** |
| presentation | xAI — Eve (`eve`), language `en` | **Azure — Sonia (`en-GB-SoniaNeural`), `en-GB`** |

Speed settings (1.0 on every role), the `belt_ramp` target-speed flag, the cadence
profiles and the provider block were left untouched. The shape now matches every
other healthy Azure course (`cat_for_eng`, `deu_ch_for_eng`, `mlt_for_eng`, …):
bare provider spelling in `voiceId`, `azure_`-prefixed spelling in `course_audio`.

### Proof it works again

Dry-run before the change: **all four roles refused.** Dry-run after: all four resolve
and name the right voice. Then one real clip per role through the normal
`/regenerate-role` route — the pipeline's own chain, its own veracity gate:

| Role | probe clip | rendered voice | transcribed back |
|---|---|---|---|
| known | "around the" | `azure_en-GB-SoniaNeural` | pass, CER 0 |
| target1 | "meglio di come mi sentivo" | `azure_it-IT-ElsaNeural` | pass, CER 0 |
| target2 | "non ti dispiace aiutarmi" | `azure_it-IT-BenignoNeural` | pass, CER 0 |
| presentation | "The Italian for: 'this evening'…" | `azure_en-GB-SoniaNeural` | pass, CER 0.05 |

Four clips, one per role, each an existing line re-rendered in its own incumbent
voice — so no voice changed anywhere and nothing was deleted. `audio_revision` went
1 → 2 on those four rows. Nothing else was regenerated.

### The same mismatch elsewhere — listed, not fixed

Twenty-nine courses carry xAI on at least one role. Not touched; a separate decision.
`ita_for_eng` was the extreme case (all four roles xAI, all four realities Azure).

Fully xAI-configured and genuinely serving xAI clips (a repoint here is a real
migration, not a correction): `deu_for_eng`, `fra_for_eng`, `eng_for_ben`,
`eng_for_hin`, `kor_for_hin`, `zho_for_hin`.

Configured xAI on a role that is actually served by Azure — the same shape as Italian,
in part: `deu_at_for_eng` (known, presentation), `eng_for_ara` (t1, t2),
`eng_for_jpn` (t1), `eng_for_zho` (t1, t2, known), `fra_ca_for_eng` (known),
`jpn_for_eng` (known, presentation), `kor_for_eng` (known, presentation),
`por_br_for_eng` (known), `spa_for_eng` (known, presentation),
`spa_mx_for_eng` (known), `fin_for_eng` (known, t2).

Configured xAI and served on English clone voices: `eng_for_guj`, `eng_for_kan`,
`eng_for_mar`, `eng_for_pan`, `eng_for_sin`, `eng_for_tam`, `eng_for_tel`,
`eng_for_urd`, `kor_for_tam`, `zho_for_tam`. `pdc_for_eng` names xAI on `known` and
is a human-voice course, so no TTS may ever run on it anyway.

---

## Fix 2 — seed 558

The line was `ita_for_eng:S0558L01U05`, a *use* sentence under seed 558:

> known: **"I didn't know it was so late"** → target: **"non sapevo che fosse così tardi"**

### Which case is this? No licensor — so the text was simply wrong

Read the sentence first, as Kai's rule requires. At 387/615/617 the licensor was
`pensare che` sitting just outside the chunk, so the repair was to redraw the boundary
leftward and swallow it. **Here there is nothing to merge toward.**

- The chunk seed 558 teaches is `S0558L01` = *così tardi* / "so late". It carries no
  verb and no mood at all, so no boundary redraw can reach a licensor.
- The governing verb is `sapere` in the past — a fact-reporter. The speaker is stating
  that it really *was* late. No `pensare`/`credere`, no `come se`, no `prima che`, no
  hypothetical `se`, no negative or superlative antecedent. Nothing licenses a
  subjunctive.
- The course has already decided this. After `(non) sapevo che` it teaches the
  indicative everywhere: *non sapevo che era vero* (375), *non sapevo che erano quasi
  pronti* (449), *sapevo che lo pensavi* (616), *sapevo che lo avevano rotto* (622),
  *sapevo che era la sua borsa* (637). Seed 375 in particular already maps the known
  frame "I didn't know it was …" onto `non sapevo che era …`. Leaving `fosse` would
  give one known prompt two different targets — a ZUT reject on its own terms.

So: **case two.** The sentence was wrong Italian, and the indicative is the correct
text. (In loose speech `non sapevo che fosse` is heard; the course's own established
mapping is not, and consistency is what ZUT measures.)

### Before → after

| | was | is now |
|---|---|---|
| target | non sapevo che **fosse** così tardi | non sapevo che **era** così tardi |
| known | I didn't know it was so late | *unchanged* |

No boundary was moved, so no LEGO text changed, no `is_new` flag moved, no phrase ids
were reissued, no round index shifted and no learner-progress migration was needed.
Because the LEGO text is unchanged, its presentation clip still announces the right
card phrase and was correctly left alone.

The word-level decomposition was updated in the same edit: the ghost segment `fosse`
became `era`, anchored exactly as its sibling at 449 is. It recomposes to the new
target text character-for-character.

### Audio — nothing reused, two clips generated

No clip of the new text existed anywhere in the course, so the same-voice relink path
had nothing to offer and correctly dropped both target links (logged in
`content_audio_link_drops`, reason *nulled-no-same-voice-clip-for-new-text*). The
known clip was kept, because the known text did not change.

Two clips were generated through `/regenerate-phrase` — which works now, and which is
itself part of the proof for fix 1 — in the course's incumbent Azure voices:

| Role | voice | transcribed back |
|---|---|---|
| target1 | `azure_it-IT-ElsaNeural` | pass, CER 0 (exact) |
| target2 | `azure_it-IT-BenignoNeural` | pass, CER 0 (exact) |

Nothing was deleted; the two superseded `fosse` clips are still in place, unlinked.

---

## Verification, read back live

- The stored voice configuration: four roles, all Azure, voice ids matching what the
  clips hold.
- All four regeneration probes: rendered, veracity-passed, correct voice on the row.
- `S0558L01U05`: text, known clip text, both target clip texts and both clip voices
  all agree; the stored decomposition recomposes exactly to the target text.
- All ten phrases under seed 558: every audio link present, every clip's text matching
  its row. (`S0558L01U01`'s clips differ from the row by a leading capital only —
  pre-existing, not a defect.)
- Seed 558's own sentence (*È così tardi la notte*) was not modified.

## Not done / not ruled on

- The xAI residue **inside** `ita_for_eng` is untouched: roughly 900 linked clips per
  role are still on xAI voices while their siblings are Azure, so a learner still hears
  a voice change on those lines. Repointing the config does not move them; re-rendering
  them is a separate, much larger decision. This includes `S0615L02U06`, already
  flagged this morning.
- The twenty-eight other courses with an xAI-configured role are listed above and left
  alone.
