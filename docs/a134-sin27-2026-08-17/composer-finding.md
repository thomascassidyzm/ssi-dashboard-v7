# A-134 — the example slot was never authored, it was selected

**What #823 left as a gap — "27 Sinhala example sentences want authoring by a speaker" —
is not a gap.** The example slot in an SSi presentation clip is not authored at all. It is
*selected*, deterministically, from content the course already holds.

## The mechanism

`services/phases/phase8-audio-v13.cjs` (~3376–3520) builds every presentation clip from the
per-known-language template. For `sin` that template is:

```
{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :
```

`{seed}` is filled from a candidate pool built out of the LEGO's **own seed** and that seed's
**`phrase_role='use'` phrases**, keeping only those that contain the LEGO's `known_text` as a
substring. The pick is a weighted roll over `deterministicRand(lego_id)` — 60% a USE phrase,
25% the seed, 15% nothing — and a deliberate suppression rule drops the context entirely when
`known_text.length / contextText.length > 0.5`, on the grounds that it is redundant.

So the fix for the 27 is not to write Sinhala. It is to **re-run the course's own composer
against today's clean data** — which is what the corrupt clips failed to be built from.

## Re-running it (scripts/a134/recompose.cjs — the algorithm transcribed verbatim)

| outcome | count | what it means |
|---|---|---|
| `use_phrase` | 11 | a real, course-authored Sinhala example is restored |
| `seed` | 1 | the seed sentence itself is restored |
| `none_overlap` | 10 | context suppressed **by the generator's own rule** — headword-only is correct |
| `none` | 5 | no USE phrase contains the card's Sinhala at all — see below |

**12 of the 27 change**; the other **15 keep #823's headword-only clip, which the generator
agrees with.** #823's render was right for 15 and short for 12.

## Orientation correction

`eng_for_sin` is **English for Sinhala speakers**: `known_lang='sin'`, `target_lang='eng'`.
The KNOWN/prompt side is **Sinhala**; the TARGET/answer side is **English**. The commissioning
brief stated the reverse. The presentation clip is entirely Sinhala, spoken by the *known*
voice `si-LK-SameeraNeural` — which is why the voice instruction in that brief was right even
though the orientation was not.

## Two things found on the way

**The 6 "unlinked" clips are orphans, not clips.** `S0181L03, S0181L04, S0197L03, S0198L03,
S0202L03, S0204L02` return **zero rows** from `course_legos` — those LEGO ids do not exist in
the course. They are `course_audio` rows left behind by a renumbering. Nothing plays them and
nothing can; they are a deletion-approval matter, not part of this fix.

**The 5 `none` cards are a real content defect.** For `S0181L02, S0207L01, S0214L01, S0218L01,
S0261L01` not one of the seed's five USE phrases contains the card's Sinhala. S0181L02's card
teaches `මගේ අම්මව එක්කගෙන යන්න` while seed 181 says `...අරගෙන යන්න` — a different verb for the
same English *take*. Course-wide this shape covers **313 of 1300 LEGOs (24.1%)**, concentrated
in seeds 1–150. Whether that is benign inflectional drift or a real teaching defect is #832's
question, and it is not in this fix's scope.

## Why no FABLE builder was dispatched

Kai authorised a fable-tier builder on the premise that the corrupt Sinhala had to be replaced
by newly-authored Sinhala. Measurement retires that premise: the Sinhala already exists, in
`course_practice_phrases`, authored and approved, and the course's own generator selects it.
Authoring fresh sentences would be *worse* — it would put text into `course_audio` that no seed
or USE phrase backs, which is precisely the drift that produced these 27. (Operationally the
point is moot: since 2026-08-09 a dispatch asking for fable runs on opus with a note.) The
genuine authoring question that remains — the 5 dead cards — needs a Sinhala speaker, not a
larger model, and is reported as a gap rather than guessed.
