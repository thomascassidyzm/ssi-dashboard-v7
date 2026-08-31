# A rule about PEOPLE was being applied to THINGS

**2026-08-31.** Tom, reading the consent census: *"this is impossible - it is only me and
Aran with cloned voices."* He was right. This is the correction, the corrected census, and
a straight moot-vs-genuine verdict on every earlier finding.

## The lesson, named

"We are never going to use a voice without consent" is a rule about **people whose voices we
hold**. The check built from it asked the question of **every row in `voices`** — 288 of
which are catalogue entries licensed from Cartesia, Azure and xAI: Skylar, Daniel, Gemma,
Liam, Oliver, Ollie Multilingual, `azure_en-US-JennyNeural`. There is nobody to ask for one
of those. "No consent recorded" against a stock voice is not a gap in our records; it is the
check asking a question that does not apply.

The specific line that did it, in `consent.isAboutAPerson()`:

```js
if (statusOf(voice) !== 'not_recorded') return true   // ← any state written = a person
```

That is backwards. Writing a consent state onto a stock row **made it a person, permanently**,
and no fact about the voice could take it back. And it failed the other way too, which is the
half nobody had noticed: `elevenlabs_FOIN928B9X0jwgJ95cLt` — *"English Narrator (Aran Clone -
Presentation)"* — has a null `metadata_source`, so the old test called it stock and **the block
waved a real clone of a real person straight through**.

## The correction

`services/shared/voice-personhood.cjs` — one answer, now shared by the gate,
`consent.describe()`, `consent-capture.cjs` and both census tools, which between them held
five inline copies of the rule. **Stock unless something says otherwise**, and every
"otherwise" is a fact the estate holds, never a name on a list that would rot the first time a
vendor published a voice:

| kind | evidence |
|---|---|
| `recordist` | `type = 'human'`, or a `human_*` id — a person **by construction**, outranking everything, row or no row |
| `clone` | provenance a clone flow wrote (`cartesia-clone (Voice Lab)`), or the word in the name/notes somebody typed when they made it |
| `named` | `consent_person` filled in, or a recorded `refused` / `withdrawn` / `awaiting_authorisation` |
| `stock` | everything else |

**Two ordering rules the live data forced.** Both are in the tests as real rows, because the
first version of the module got both wrong:

- `bedd6226` ("Olivia") is an xAI **catalogue** voice whose notes quote Tom calling something
  *"his own clone"*. A word-search over notes made her a person and would have refused
  **1,367 live cast sites**. So catalogue provenance beats loose clone text.
- `azure_en-GB-ThomasNeural` is stock Azure carrying a probe row that says `voicelab:clone`.
  You cannot clone into Azure's namespace — this estate has **no Azure clone flow at all**,
  only Cartesia (`services/voicelab/cartesia.cjs`). So a catalogue-only engine, or a vendor
  catalogue id shape, beats clone provenance too. A voice is what it is, not what a stray row
  says about it.

**The block is not weakened.** Genuine clones and human recordists stay refused server-side at
every render and every cast. Two of Aran's ElevenLabs clones are newly caught by it. What
changed on the screens is that `needsAsking` and `castWarning` are now silent for stock, and
`describe()` publishes `kind` — so 288 amber chips stop burying the five that matter.

## The corrected census, run live

**5 clones in the whole estate — 3 of Tom, 2 of Aran. Exactly the two people he named.**

| voice | who | provider | consent |
|---|---|---|---|
| `gfzdpspr5fdp` | Tom | xAI | **not recorded** |
| `cartesia_e7ed10ad-…` (Tom_002) | Tom | Cartesia | **not recorded** |
| `cartesia_f56e05e2-…` (Tom_003) | Tom | Cartesia | authorised ✓ |
| `elevenlabs_FOIN928B9X0jwgJ95cLt` | Aran | ElevenLabs | **not recorded** |
| `elevenlabs_FVdzAUsp8apoOdc0907A` | Aran | ElevenLabs | **not recorded** |

Whole registry: **310 rows → 5 clone, 17 recordist, 288 stock.**

## Every earlier finding, moot vs genuine

**"9 live-cast voices with no consent" — the composition was wrong, the count is right.**
Re-run against the corrected gate: still 9 voices, still 2,073 sites, and **not one of them is
a stock voice**. The old census never flagged Skylar or Jenny at the cast surface; what Tom
read was the Voice Lab's *candidate list*, which printed `consent=not_recorded` beside all 288
catalogue voices. That display is the thing that was wrong, and it is fixed.

| voice | kind | sites | verdict |
|---|---|---:|---|
| `gfzdpspr5fdp` | Tom's xAI clone | 1,826 | **GENUINE** — Tom's own clone, his to authorise |
| `human_aran_cym_n` | recordist (no row) | 82 | **GENUINE** — Aran, a real person |
| `human_catrinlliar_cym_n` | recordist (no row) | 58 | **GENUINE** — Catrin Lliar, a real person |
| `human_aran_cym_s` | recordist (no row) | 56 | **GENUINE** — Aran |
| `human_catrinlliar_cym_s` | recordist (no row) | 44 | **GENUINE** — Catrin Lliar |
| `human_tom_zzz` | recordist (no row) | 3 | test slot, Tom's own |
| `human_test_f_zzz` | recordist (no row) | 2 | test slot |
| `human_sasha_wanasky_deu_at` | recordist (no row) | 1 | **GENUINE** — a real person |
| `human_kai_fin` | recordist | 1 | test slot, Kai |

**"2,073 unconsented cast sites" — the number stands; only 1,826 of them are a clone.**
The other 247 are `human_*` recordist slots. **Stock voices account for zero of the 2,073.**

**"Six voice ids with no consent row at all" — seven, and none of them stock.** They are
`human_aran_cym_n`, `human_aran_cym_s`, `human_catrinlliar_cym_n`, `human_catrinlliar_cym_s`,
`human_tom_zzz`, `human_test_f_zzz`, `human_sasha_wanasky_deu_at`. Every one is a **real
person's own recordings**, not a clone and not a catalogue voice, so none is moot — but this
is the bucket that is *not* what Tom's ruling was aimed at, and it is flagged below as his call.

**Was production actually blocked?** No — and this is worth stating plainly rather than
implying a near-miss. Auditing the live gate before the fix, no stock voice was refused at any
cast or render, because the only stock rows carrying a consent state were an authorised test
probe. The damage was on the screens, and the trap was armed: the first consent state written
onto a stock row would have refused it permanently.

## The one-click path, and what it covers

`POST /api/voicelab/voices/:voiceId/consent-declaration` (landed on `main` in the PodLab cast
work, 25336a06b) records an evidenced yes onto a voice that **already exists** — read aloud and
checked by whisper, or a named written statement — and creates the `voices` row when there is
none. `ConsentStep.vue` is wired into PodLab's cast panel and `VoiceConfiguration`, opening
exactly when the server returns `NO_RECORDED_CONSENT`. There is also
`PUT /api/voicelab/voices/:voiceId/consent`, admin-only, for the direct decision record.

**It covers Tom's clone and Aran's**: every one of the five clone ids is an existing `voices`
row, so the update branch applies, and the seven row-less `human_*` recordist ids hit the
create branch. Since a stock voice is no longer refused, the consent step can never open for
one — the two fixes fit together.

**Nothing has been pre-recorded or minted here.** Tom gives consent for his own clone and,
having asked him, for Aran's. That is his to do and nobody else's.

## Left for Tom — one decision

The 17 `human_*` recordist ids (Aran, Catrin Lliar, Sasha Wanasky, Kai, and the Welsh/Spanish
course slots) are **real people's own recordings, not clones and not stock**. Tom's ruling was
about clones, and his sentence — "it is only me and Aran" — is true of clones and not of
recordists. They are therefore left **blocked**, deliberately: unblocking a real person's own
voice is a weakening, and weakening the block is not mine to do. If Tom wants the recordist
bucket handled differently from the clone bucket, that is one ruling and it changes one line.

## Files

- `services/shared/voice-personhood.cjs` — the classifier (new)
- `services/shared/voice-personhood.test.js` — 10 tests, rows transcribed verbatim from live data
- `services/shared/voice-consent-gate.cjs` — delegates personhood; also reads `notes`/`tts_engine`
- `services/voicelab/consent.cjs` — `isAboutAPerson` delegates; `describe()` gains `kind`; `needsAsking`/`castWarning`/`summarise` honest for stock
- `services/voicelab/consent-capture.cjs` — fifth inline copy of the rule removed
- `tools/voice/census-unconsented-cast-{voices,summary}.cjs` — shared rule, and each blocked voice now prints its kind
