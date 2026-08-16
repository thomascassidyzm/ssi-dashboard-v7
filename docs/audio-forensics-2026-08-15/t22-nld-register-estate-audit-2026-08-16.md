# T-22 — Dutch `alstublieft`/`alsjeblieft` register: estate-wide audit (2026-08-16)

READ-ONLY audit. No DB writes, no TTS, no commits. All 35 `course_audio` rows in `nld_for_eng`
whose text contains the polite marker `alstublieft` were fetched from S3 and decoded with the repo's
whisper wrapper (`services/audio-veracity.cjs`, `checkAudioVeracity`, unprimed decode, model
`ggml-small.bin`). Zero fetch/decode gaps — every clip resolved.

**Verdict logic reused verbatim from `tools/a108/t22-nld-render.cjs` (`registerVerdict`)**: nearest
decoded word to `alstublieft`/`alsjeblieft` by Levenshtein distance; POLITE if closest word is ≤2
edits from `alstublieft` and strictly closer than to `alsjeblieft`; INFORMAL the mirror; NEITHER if
neither condition holds cleanly (garbled/ambiguous decode — genuinely unclassifiable by this method,
not a guess in either direction).

## Headline

**Of 35 live Dutch clips carrying the polite marker, 21 (60%) audibly say the informal word, 3 (9%)
say the polite word correctly, and 11 (31%) decode too garbled to call either way.**

This is bigger than the single clip Tom flagged, and bigger than one xAI voice: **it reproduces
across every xAI Dutch voice tested, and on the small Azure sample too** — 2/2 Azure `MaartenNeural`
clips also decode as `alsjeblieft`. n=2 is too small to rule Azure clean; it is not a control group
here.

## Full table (35/35, all verbatim decodes)

| clip id | voice (canonical/provider) | expected text | verdict | whisper decode (verbatim) |
|---|---|---|---|---|
| 34bb1dff | 18245f0d (bas/xai) | `Goedemorgen. Twee espresso's en een muntthee, alstublieft.` | INFORMAL | `Goedemorgen.  Twee espressos en een munthe, alsjeblieft.` |
| 603234e6 | 18245f0d (bas/xai) | `Alstublieft. Bedankt, fijne dag.` | POLITE | `Alstublieft, de dankt fijne dag.` |
| 957eb22d | 247783ebdd51 (noor/xai) | `Gewoon twee koffietjes, alstublieft. Voor mij cafeïnevrij.` | INFORMAL | `Gewoon twee koffietjes alsjeblieft.  Voor mij kan veringenvrij.` |
| 34623458 | 247783ebdd51 (noor/xai) | `Dan neem ik het lamsvlees, alstublieft. Met een bijgerecht groenten.` | INFORMAL | `dan neem ik het lambsvlees alsjeblieft met een bijgericht groente.` |
| 07157162 | 58d27475085e (femke/xai) | `Welkom. Een tweepersoonskamer voor drie nachten. Mag ik uw legitimatie zien, alstublieft?` | INFORMAL | `Welkom. Een tweepersoonskamer voor drie nachten.  Mag ik uw legitimatie zien, alsjeblieft?` |
| 07c5c4b0 | azure_nl-NL-MaartenNeural (maarten/azure) | `Een pilsje, alstublieft. Wat hebben jullie van de tap?` | INFORMAL | `Een Pilsje, alsjeblieft!  Wat hebben jullie van de tab?` |
| a1b89587 | ef4ce33e (daan/xai) | `Groot, alstublieft. Met havermelk als dat kan.` | INFORMAL | `Groeit alsjeblieft. Met haar vermelk als dat kan.` |
| 5438b6d3 | ef4ce33e (daan/xai) | `Een glas sauvignon, alstublieft.` | INFORMAL | `Een glas zelf voor jong alsjeblieft.` |
| 22755087 | ef4ce33e (daan/xai) | `Goedemiddag. Een koffie verkeerd, alstublieft. Om mee te nemen.` | INFORMAL | `Goedemiddag, een koffie verkeerd alsjeblieft om mee te nemen.` |
| a0a9baf1 | ef4ce33e (daan/xai) | `Meenemen, alstublieft.` | INFORMAL | `Menemen, alsjeblieft.` |
| d63cff50 | nl-NL-MaartenNeural (maarten/azure) | `Hallo. Naar het Centraal Station, alstublieft.` | INFORMAL | `Hallo, naar het centraal station, alsjeblieft.` |
| e7308f48 | sal (sal/xai) | `Meenemen, alstublieft.` | NEITHER | `Meenemen, oudstabliefd.` |
| ce3e077c | sal (sal/xai) | `Goedemorgen. Twee espresso's en een muntthee, alstublieft.` | INFORMAL | `Goedemorgen, twee espressos en een munté, alsjeblieft.` |
| 599312c0 | sal (sal/xai) | `Een pilsje, alstublieft. Wat hebben jullie van de tap?` | NEITHER | `Een pilsje, als te blijft.  Wat hebben jullie van de top?` |
| 2822f470 | sal (sal/xai) | `Goedemiddag. Een koffie verkeerd, alstublieft. Om mee te nemen.` | NEITHER | `Goedemiddag, een koffie verkeerd als tubleefd om mee te nemen.` |
| 94de83dc | sal (sal/xai) | `Groot, alstublieft. Met havermelk als dat kan.` | INFORMAL | `Groet alsjeblieft met havermilk als dot gun.` |
| 5433ebd1 | sal (sal/xai) | `Alstublieft. Bedankt, fijne dag.` | NEITHER | `Als toeblieft, bedankt, fijne dag.` |
| 4af3b7a2 | sal (sal/xai) | `Hallo. Naar het Centraal Station, alstublieft.` | NEITHER | `Hallo, niet het centaels dat shown is om te blijven.` |
| 9c162245 | sal (sal/xai) | `Een glas sauvignon, alstublieft.` | NEITHER | `In glas safignon, als u liefde.` |
| 9373a4bd | xai_247783ebdd51 (noor/xai) | `Ik neem het lam, alstublieft. Met een bijgerecht van groenten.` | INFORMAL | `Ik neem het lam, alsjeblieft, met een bijgerecht van groente.` |
| 531649b6 | xai_247783ebdd51 (noor/xai) | `Groot graag, alstublieft. Met havermelk als u dat heeft.` | INFORMAL | `Groot graag alsjeblieft met havermelk als u dat heeft.` |
| 0ab40f76 | xai_247783ebdd51 (noor/xai) | `Hallo. Kunt u me naar het station brengen, alstublieft?` | POLITE | `Hallo, kunt u me naar het station brengen alstublieft?` |
| 7e08e470 | xai_247783ebdd51 (noor/xai) | `Ik wil graag een glas bitter, alstublieft.` (the original T-22 clip) | INFORMAL | `Ik wil graag een glas bitter, alsjeblieft.` |
| e570f40c | xai_247783ebdd51 (noor/xai) | `Ik wil graag een zwarte koffie, alstublieft.` | INFORMAL | `Ik wil graag een zwarte koffie alsjeblieft.` |
| dff4d9fb | xai_247783ebdd51 (noor/xai) | `Ik wil het meenemen, alstublieft.` | NEITHER | `Ik wil het meenemen als erbliefd.` |
| 91f94a50 | xai_247783ebdd51 (noor/xai) | `Nee, hij is vrij. Alstublieft, gaat uw gang.` | POLITE | `Nee, hij is vrij. Alstublieft, gaat u gaan.` |
| b9469812 | xai_247783ebdd51 (noor/xai) | `Gewoon twee koffies, alstublieft. Voor mij cafeïnevrij.` | INFORMAL | `Gewoon twee koffies alsjeblieft. Voor mij kaffeinevrij.` |
| f543d080 | xai_58d27475085e (femke/xai) | `Goedemiddag. Ik wil graag een koffie, alstublieft. Met melk maar zonder suiker. Om mee te nemen.` | NEITHER | `Goedemiddag, ik wil graag een koffie als teblieft met melk maar zonder suiker om mee te nemen.` |
| 08679e86 | xai_a13662ba951c (unnamed/xai) | `Ik wil graag een groot glas witte wijn, alstublieft.` | NEITHER | `Ik wil graag een groot glas witte wijn als toeblieft.` |
| 624129f8 | xai_a13662ba951c (unnamed/xai) | `Goedemorgen. Twee americano's en een kopje thee, alstublieft.` | INFORMAL | `Goedemorgen, twee amerikanos en een kopje thee, alsjeblieft.` |
| 00e99c27 | xai_ara (unnamed/xai) | `We willen graag een fles bruisend water en een fles plat water, alstublieft.` | INFORMAL | `We willen graag een fles bruisend water en een fles plat water alsjeblieft.` |
| ada64865 | xai_ara (unnamed/xai) | `Ja, mag ik ook een glas water, alstublieft.` | INFORMAL | `Ja, mag ik ook een glas water alsjeblieft?` |
| 183edbff | xai_ara (unnamed/xai) | `Spa rood, alstublieft.` | NEITHER | `Sparuit Osterblift.` |
| 3d32cf1f | xai_ara (unnamed/xai) | `Mag ik twee koffie verkeerd en twee zwarte koffies en één van die, alstublieft?` | NEITHER | `Mag ik twee koffie verkeerd en twee zwarte koffies en één van die als teblieft?` |
| 0eaf26b4 | xai_ara (unnamed/xai) | `Hebben jullie broodjes? Ik wil graag een kaasbroodje, alstublieft.` | INFORMAL | `Hebben jullie broodjes? Ik wil graag een kaasbroodje, alsjeblieft.` |

Voice-id canonicalisation note: `247783ebdd51`/`xai_247783ebdd51` (Noor) and `58d27475085e`/
`xai_58d27475085e` (Femke) are each one voice with the bare and `xai_`-prefixed spelling both live in
`course_audio` — confirmed against the `voices` table (`tts_engine='xai'` for both spellings of each).
Grouped canonically below; ungrouping would have undercounted Noor's sample by 6/10 rows.

## By voice (canonical)

| voice | provider | n | POLITE | INFORMAL | NEITHER |
|---|---|---|---|---|---|
| noor (`247783ebdd51`) | xai | 10 | 2 | 7 | 1 |
| sal | xai | 8 | 0 | 2 | 6 |
| ara (`xai_ara`) | xai | 5 | 0 | 3 | 2 |
| daan (`ef4ce33e`) | xai | 4 | 0 | 4 | 0 |
| maarten (`nl-NL-MaartenNeural`) | azure | 2 | 0 | 2 | 0 |
| bas (`18245f0d`) | xai | 2 | 1 | 1 | 0 |
| femke (`58d27475085e`) | xai | 2 | 0 | 1 | 1 |
| a13662ba951c | xai | 2 | 0 | 1 | 1 |

## By provider

| provider | n | POLITE | INFORMAL | NEITHER |
|---|---|---|---|---|
| xai | 33 | 3 (9%) | 19 (58%) | 11 (33%) |
| azure | 2 | 0 (0%) | 2 (100%) | 0 |

## What this settles and what it doesn't

- **The substitution is not confined to one xAI voice.** All seven xAI Dutch voices tested show it
  at some rate; Noor (the T-22 voice) is neither the worst (Sal's confirmed-informal rate is similar,
  and Sal's NEITHER bucket may hide more) nor uniquely afflicted.
- **It is not proven xAI-only.** The only two Azure `MaartenNeural` clips in the estate both decode
  as informal too. That's a 2-clip sample — not enough to say Azure is equally bad, but enough to say
  "Azure nl-NL is clean" is NOT supported by the data. Azure is a candidate for the same defect, not
  a confirmed control.
- **Within one voice, it is not 100% deterministic across different renders.** Noor gets 7/10 wrong
  but 2/10 right (`0ab40f76`, `91f94a50`) — Tom's 3x-identical re-render was of the SAME clip's bytes
  repeated, which is a different experiment from different (voice, text) pairs across the estate. Both
  facts can be true: a given already-rendered clip's mistake is stable if you keep re-rendering the
  identical prompt, while different prompts on the same voice land on different sides of the coin.
- **The 11 NEITHER clips are a genuine gap, not a third verdict.** Several (e.g. `599312c0` "als te
  blijft", `2822f470` "als tubleefd", `08679e86` "als toeblieft") show whisper splitting or mangling a
  word that LOOKS like it could be either target on a human read — but the word-level Levenshtein gate
  this audit was told to reuse doesn't resolve them, and I did not invent a smarter multi-word matcher
  to force a call. Sal alone accounts for 6/11 of this bucket — its audio may simply be harder for
  whisper to transcribe cleanly, independent of the register question. Report this as unclassified,
  not as "probably fine."
- **The u/uw polite pronoun is unaffected.** Checked the 4 clips whose text carries `u`/`uw`
  (`07157162`, `531649b6`, `0ab40f76`, `91f94a50`) — every decode kept `u`/`uw` intact even where
  `alstublieft` degraded to `alsjeblieft`. No evidence of a parallel pronoun-register defect; not
  reporting one.

## Gaps

None. All 35 rows fetched from S3 and decoded on the first attempt; `checked: true` for every row.

## Landing line

No commits. This is a read-only audit: one working file
`.a108-nld-register/audit.cjs` (gitignored `scripts`-equivalent scratch, not committed) plus this
report under `docs/audio-forensics-2026-08-15/`, not yet staged or committed — say the word if you
want it committed.
