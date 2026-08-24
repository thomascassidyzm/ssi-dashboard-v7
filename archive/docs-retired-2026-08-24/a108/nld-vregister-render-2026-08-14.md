# A-108 — the Dutch V-register render, finished

**2026-08-14. nld_for_eng, pod-0 and pod-0-unrecorded. 29 clips, 51 rows. APPLIED.**

Twenty-nine Dutch pod clips spoke a T-form at a barista, a bartender, a waiter, a shop
assistant, a pharmacist, a taxi driver and a stranger on a train. They now speak the V-form.
Text and audio moved in the same statement, so there was never an instant at which a learner
could see the new words against the old audio.

## Final count

| | |
|---|---|
| clips rendered and verified | **29 / 29** |
| rows swapped | **51 / 51** |
| rows still pointing at a superseded clip | **0** |
| rendered this run | 8 |
| adopted from the killed first run, re-verified from scratch | 21 |
| cost | **$0.0067** (448 characters at xAI $15/1M) |
| old clips deleted | none — left in place, unreferenced |

The 21 adopted clips were not trusted because they were already there. Adoption skipped the
spend, never the checks: every one went through the same alive/voice/decode/truncation
verification as a clip fresh off the wire, before any link moved.

## Verification

All ten structural checks passed:

- 51 rows on the new clips; no row still on a superseded clip; all 29 new clips referenced
- every row's text byte-identical to its clip's `course_audio.text` — the desync this job existed to prevent
- no row became a draft; no clip changed voice; all six voices xAI, no Azure fallback
- all 29 new clips alive on S3 and decoding (29/29 probed)
- the bartender now reads **"Eet u vanavond?"** (2 rows); nothing still reads "Eten jullie vanavond?"
- **the 6 business-`jullie` rows are untouched** — "Hebben jullie een menu?", "Welke ales hebben
  jullie?", "Hebben jullie contactloos betalen?" address the business, not the person, and are
  correct V-register Dutch. Tom's ruling, 2026-08-14.

### Pacing — b09bab21

The original clip ran +1.7sd slow. Its replacement does not:

```
pacing baseline: mean 75.8 ms/char, sd 22.8 (n=258)
b09bab21 -> f543d080: 6840ms, 71.3 ms/char, z = -0.2
outliers |z| >= 1.5 across all 29: none
```

10,896 ms became 6,840 ms for the same sentence bar one word. The pacing issue is gone, and no
new clip introduced one.

### Register, heard aloud

Whisper is evidence here, not a gate — a false abort after paying for 29 renders is worse than a
flagged row. Adjudicated per clip:

**CONFIRMED 22 · BLIND 7 · CONTRADICTED 0.**

The pronoun/verb class decodes cleanly: "voor je doen" → "voor u doen", "wil je" → "wilt u",
"ga je gang" → "gaat uw gang", "dank je" → "dank u", "ben je" → "bent u". Same voice, same
sentence, whisper resolving the exact distinction the job turns on.

`alsjeblieft` → `alstublieft` is the hard pair: two long, phonetically close words where the
T-form dominates any Dutch corpus, so whisper-medium collapses toward it. Seven clips came back
BLIND on that alone. I re-decoded all seven **against their own superseded clips under an
identical V-form-primed prompt** — a discriminating test, because the old clips still decoded
`alsjeblieft` under that same prompt rather than being dragged to the new form.

**Six of the seven flipped decisively.** The new clip said `alstublieft`, the old one
`alsjeblieft`, same model, same prompt.

## The one open item — clip `7e08e470`, row `nld_for_eng:pod-0:SC08-S004`

> "Ik wil graag een glas bitter, alstublieft." — Customer 1, voice `xai_247783ebdd51`

This is the seventh. It is the single clip machine verification could not settle, and I am
reporting it rather than rounding it up to a pass.

Evidence is genuinely split:

- **Against it:** token-level decode discriminates on this voice — a known-good V-form clip on
  the *same voice* tokenises `al·st·ub·lie·ft`, the superseded T-form clip tokenises
  `als·je·bl·ie·ft`. `7e08e470` tokenises `als·je·bl·ie·ft`, matching the T-form.
- **For it:** the word occupies 830 ms, against 780 ms for the same voice's known `alstublieft`
  and 620 ms for its own superseded `alsjeblieft`. On length it is the V-form.

I ran two further discriminators and **both were invalidated by their own controls** — isolated
single-word decoding returned "Alsjeblieft" even for the clip proven to speak `alstublieft`, and
a slowed decode did the same. Machine methods are exhausted; what remains is an ear.

State right now: the row's text and its `course_audio.text` are the corrected V-form and agree
byte-for-byte, and the clip is alive, correct-voiced, decodable and not truncated. The risk, if
the decode is right, is one clip whose audio says `alsjeblieft` under text that says
`alstublieft` — one row, scene 8.

Fixing it is not a re-render: same course, same text, same voice already occupies the
`unique_course_audio_per_voice` slot, so a replacement needs the clip retired first, and
retiring a generated asset needs its own plan and approval. **One human listen decides whether
that plan is needed at all.**

## Files

- `tools/pods/nld-vregister-render-2026-08-14.cjs` — render, verify, swap; resumable
- `tools/pods/nld-vregister-decode-adjudicate-2026-08-14.cjs` — per-clip register verdict
- `tools/pods/nld-vregister-final-verify-2026-08-14.cjs` — the ten structural checks + pacing
- `docs/a108/nld-vregister-render-applied-log.json` — per-clip log, transcripts included
- `docs/a108/nld-vregister-decode-adjudication.json`
- `docs/a108/nld-vregister-final-verification.json`
