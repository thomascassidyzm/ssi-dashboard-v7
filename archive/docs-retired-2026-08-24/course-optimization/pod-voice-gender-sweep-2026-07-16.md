# Listening-pod voice/gender sweep — 2026-07-16

Triggered by a learner report (Thai listening pods: male voice using female
politeness particles → "lady boy"). Investigation showed the same casting fault
across many pod courses: a speaker voiced by a voice whose gender doesn't match
the gendered speech in their lines (or contradicts the cast's own `gender`
field). Root cause = the original pod cast auto-assignment couldn't gender
role-names ("Waiter"/"Driver"/"Barista") and mis-coloured voices.

## Tooling (committed)
- `tools/gendered-speech.cjs` — shared gendered-speech markers + `detectGenderFromTexts`.
  Covers tha, heb, ara, pol, hrv, ukr, hin, spa, ita, por, fra, cat, ron, ell,
  isl, lav, lit. (jpn still scaffolded.) All 1st-person-anchored (precision-first).
- `tools/audio-gender-lint.cjs` — `--all-pods` audit: universal metadata check
  (cast gender vs assigned-voice gender) + lines-vs-voice check where patterns exist.
- `tools/pod-recolour.cjs` — `genderOf` now reads the speaker's own lines
  (marker → text → name) so future casting self-corrects.
- `scripts/pod-gender-fix.cjs <course> [--apply]` (gitignored) — generic fixer:
  trusts cast.gender when set, uses lines when cast=n, FLAGS cast-vs-text
  conflicts (doesn't auto-flip), reassigns wrong-gender voices to a correct
  voice already in the cast, nulls changed audio for `/generate-pods` refill.

## FIXED & verified (15 courses)
tha_for_eng, heb_for_eng, ara_sy_for_eng (bespoke recasts), then via the generic
fixer: cat_for_eng, cat_for_spa, ell_for_eng, fra_ca_for_eng, isl_for_eng,
lav_for_eng, lit_for_eng, ron_for_eng, ukr_for_eng, bul_for_eng, and two special
cases:
- **hin_for_eng** — Hindi renderer used masculine verb forms (`सकता हूँ`) for
  the Barista (already male voice+text → set cast=m + male English gloss) and
  Receptionist (female voice → text fixed `देख सकता`→`देख सकती`).
- **ita_for_jpn** — "Friend" collapsed a female evening-friend (`sono occupata`)
  and a male practice-partner; split the evening friend → female voice.

Common fault everywhere: **Driver** (cast m → female voice), **Tourist** (cast m
→ female voice), **Barista** (cast f → male voice); plus **Customer 1/Learner**
(male-scripted, female voice) and **fra_ca Anna** (female protagonist on a male
voice). All re-voiced + regenerated; every fixed course verified 0 findings and
0 NULL audio. Pre-change casts backed up in `temp/pod-gender-fix-backup/`,
`temp/{tha,heb,arasy}-recast-backup/`.

## hrv_for_eng — FIXED 2026-07-17 (Aran gave the go-ahead)
- **pod-1**: Nadia/Ellie/Rosie (cast=n, female lines `…sam mislila/zaplakala/željela…`)
  → reassigned to `hr-HR-GabrijelaNeural` (F) + `bedd6226` known.
- **pod-0**: Barista (cast f, on male Srecko) → `hr-HR-GabrijelaNeural`.
- Regenerated via `/generate-pods` — **Azure only, 0 ElevenLabs** (hrv's female
  fix voice is Azure Gabrijela). Both pods now 0 NULL audio, cast audit ✓.
- ⚠️ pod-1 also had **~69 PRE-EXISTING empty (NULL-audio) turns** unrelated to the
  gender fix; the same Azure regen filled them, so pod-1 is now fully voiced.
- NOTE: hrv **pod-0** still uses some **ElevenLabs** voices (Anna/Learner/Customer
  = Sarah/George/Laura ids) — those were already correct and were NOT touched. If
  they ever need regeneration, ElevenLabs credits are needed (out until the 26th)
  OR migrate them to xAI/Azure. Script: `scripts/hrv-fix.cjs`; backup
  `temp/pod-gender-fix-backup/hrv_for_eng*.cast.json`.

## Not applicable / not covered
- 16 `eng_for_*` courses: target is English, which doesn't gender the speaker.
- Non-gendered-speech langs (deu/nld/dan/nor/swe/tur/kor/zho/eus/fas/hye/est/
  cym/gle/swa/nep): no speaker-gender marking, metadata-clean.
- **jpn: investigated 2026-07-17 — NO fix needed.** The pods use polite です/ます,
  which is gender-neutral (men & women speak identically). jpn_for_eng:pod-0:
  142 lines, 115 polite, ZERO real gender markers (僕/俺/あたし/わ/ぞ/かしら all
  absent; the ぞ hits were どうぞ, the のよ hit was どのような). No speaker gender in
  the text → no audible mismatch possible. The one cosmetic item (Barista cast=f
  on the male voice) is deliberately LEFT: the text is neutral so it's not wrong,
  and Japanese has only 3 female voices — all belonging to speakers the barista
  talks to — so forcing it female would create two identical female voices in the
  café (hurts speaker-distinction in a listening exercise). Male barista aids
  distinction. Decision recorded in tools/gendered-speech.cjs.

## Separate follow-up (NOT pods)
tha/heb (and likely other) **practice-phrase** audio has the same female-voice-
on-male-default-form issue because both voices read every phrase — that's the
gender-expansion job (`services/gender-prep-coordinator.cjs`), not the pod cast.
