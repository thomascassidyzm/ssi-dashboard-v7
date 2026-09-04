# Voice-variety mismatches, and counts that cannot both be true

**10 variety mismatches. 22 count-reconciliation failures.**

Plus a third number that matters more than either, and was not asked for: **20 voices are each cast as the primary for two or more varieties of one language** — at most one of those claims can be true.

Measured 2026-09-04 across all 149 courses and all 147 cast rows. Read-only: nothing was recast, rendered or deleted. Which native voice replaces a wrong one is your ear and nobody else's.

Both checks now run nightly at 05:55 London. They are armed and have been run once end to end.

---

## 1. Variety mismatches — 10, in 2 courses, reaching 29,382 clips

The rule being applied is yours, via RBF: *the voice is a claim about the content* — target-side audio must be native to the variety the course claims to teach; the known side may be anyone.

| Course | Layer | Role | Voice | What the learner actually hears | Clips |
|---|---|---|---|---|---|
| `ara_for_eng` | clips | target1 | `azure_ar-EG-SalmaNeural` | Modern Standard Arabic read by an Egyptian voice — it sounds like Cairo without being it | 7,349 |
| `ara_for_eng` | clips | target1 | `azure_ar-SA-ZariyahNeural` | MSA read by a Saudi voice — it sounds like the Gulf without being it | 7,310 |
| `ara_for_eng` | clips | target2 | `azure_ar-EG-ShakirNeural` | MSA read by an Egyptian voice | 7,354 |
| `ara_for_eng` | clips | target2 | `azure_ar-SA-HamedNeural` | MSA read by a Saudi voice | 7,310 |
| `ara_for_eng` | clips | target1 | `ar-EG-SalmaNeural` | same voice, bare spelling of the id | 31 |
| `ara_for_eng` | clips | target2 | `ar-EG-ShakirNeural` | same voice, bare spelling | 26 |
| `ara_for_eng` | stored | target1 | `ar-SA-ZariyahNeural` | what the course renders in | — |
| `ara_for_eng` | stored | target2 | `ar-SA-HamedNeural` | what the course renders in | — |
| `nld_for_eng` | clips | target1 | `azure_en-GB-AdaMultilingualNeural` | Dutch content read by an English voice | 1 |
| `nld_for_eng` | clips | target2 | `azure_en-GB-AdaMultilingualNeural` | Dutch content read by an English voice | 1 |

**`ara_for_eng` is worse than the specimen you were given.** It is not just Saudi-on-MSA. The course is **half Saudi and half Egyptian** — roughly 14,660 Saudi clips and 14,720 Egyptian clips, in both target roles. A learner walking that course hears MSA text delivered in two different national accents, alternating, neither of which is MSA. That is not one wrong casting decision; it is two, layered.

**The regional Arabic courses are clean.** `ara_eg_for_eng` is on `ar-EG` voices and `ara_lb_for_eng` is on `ar-LB` voices — both correct. The defect is confined to the course that claims the *unmarked* variety.

`nld_for_eng` is two clips, almost certainly a stray from a multilingual voice. Trivial in size, worth knowing it exists.

## 2. One voice, two varieties — 20 (new, from last night's draft cast)

Job #446 filled the cast table hours before this check was written. It assigns **the same Cartesia voice to every variety of a language**:

| Voice | Cast as primary/backup for |
|---|---|
| Huda, Nour, Youssef, Zain | `ara`, `ara_eg`, `ara_lb`, `ara_sy` — four languages |
| Marlene, Vreni, Clemens, Sebastian | `deu`, `deu_at`, `deu_ch` |
| Ximena, Laura, Darío, Ramon | `spa`, `spa_mx` |
| Inès, Jade, Étienne, Mathis | `fra`, `fra_ca` |
| Eloá, Alice, Felipe, Rafael | `por`, `por_br` |

By your own dialect ruling these are distinct languages. One voice cannot be native to Modern Standard Arabic *and* Egyptian *and* Lebanese *and* Syrian. **This is the exact defect you are about to rule on**, and it is why the draft slots matter: accepting the draft as-is would replace the Saudi-on-MSA error with a one-voice-for-four-Arabics error — a different false claim, not a fix.

This finding needs no locale, which is why it works where nothing else does: Cartesia publishes no locale for any of its 121 voices, so the locale check can only say UNKNOWN about them. The collision is provable from the cast table alone.

## 3. Count-reconciliation failures — 22

| Failure | Count | What it is |
|---|---|---|
| Audio no content row can reach | **1** course, 1,685 clips | `ara_sy_for_eng`: 0 seeds, 0 legos, 0 phrases, and 2,974 clips (1,685 of them on content roles — the rest are pod and guide tracks). The content was deleted or never landed; the audio stayed. The Syrian voices on it are correctly cast, for content that does not exist. |
| Content and audio present, nothing linked | 0 | clean |
| Pod against canon | **21** pods | every `pod-1` in the estate holds **231 sentences against 266 canonical rows** — exactly 35 lines short, uniformly, across all 21 courses that have it. Canon grew and no pod followed. |

The pod row is phase8's own comparison — `podCanonReuseTexts` refuses audio reuse on exactly this disagreement — now standing outside the render path. It means those 35 lines are in canon and reach no learner in any language.

---

## The defaults I chose, each overrulable in one sentence

1. **Roles in scope: `target1` and `target2` only.** `known` is exempt (your ruling — nothing there to acquire); `instruction` and `encouragement` resolve against the known language and are the app talking to the learner; `presentation` is the intro/clone voice and is already outside the language cast.
2. **A locale counts as a variety claim only where something distinguishes varieties** — the estate teaches two or more varieties of that language, or the provider publishes more than one locale for it. A `fi-FI` voice on Finnish claims nothing controversial. Without this, Finnish, Afrikaans and Dutch rows are pure noise.
3. **The base language is its own variety, and it is not the home country's.** `ara` means MSA, MSA has no country, so every regional Arabic locale mismatches it. `spa` means European Spanish, so `es-ES` matches. This is the single rule that makes the Saudi case fire.
4. **Where a locale cannot express the estate's distinction, everything on that language is UNKNOWN.** Every Welsh locale is `cy-GB`; the estate teaches Northern and Southern Welsh. Convicting a Northern Welsh course on `cy-GB` would be the check inventing a claim the data never made. Same for the four Irishes.
5. **Count reconciliation runs on content roles only** (`known`, `target1`, `target2`, `presentation`). `welcome`, `instruction`, `encouragement` and `pod_*` are unlinked by design; counting them convicted 20 courses whose entire audio holding is one shared `welcome` clip.
6. **The nightly runs at 05:55 Europe/London**, clear of all seven neighbours on the box, and **from its own checkout** rather than the shared one.

## The UNKNOWN bucket — 302 of 944 pairings, and its size is the finding

| Provider | Pairings the check cannot judge | Why |
|---|---|---|
| Cartesia | 200 | publishes **no locale at all** for any of its 121 voices |
| xAI | 79 | 33 of 119 voices carry a locale; the rest carry none |
| Azure | 15 | Welsh and Irish, where no locale expresses north/south or Connemara/Munster/Ulster |
| human | 6 | a person, not a vendor locale — not judged, and does not need to be |

**Cartesia is the whole estate's casting future and it is opaque to this check.** Every one of the 146 draft slots you are ruling on today is Cartesia. The locale check can say nothing about any of them; only the one-voice-two-varieties collision can, and that only catches reuse across varieties, never a wrong-variety voice cast once. If Cartesia publishes accent or region metadata anywhere, wiring it in is the single highest-value follow-up here — it would take this check from covering a quarter of the estate to covering most of it.

## Explicit gaps

- **Cartesia variety is unknowable from the data.** Stated above. Not a limitation of the check; a limitation of what the vendor tells us.
- **A wrong-variety Cartesia voice cast on exactly one language is invisible** to both instruments. A Gulf-accented Cartesia voice cast only on `ara` would pass silently today.
- **`ara_for_eng`'s Egyptian clips were not in the brief** and I have not established when or how they arrived; I report the state, not its cause.
- **The `pod-1` 231-vs-266 gap** — I did not investigate which 35 lines are missing or why. It is uniform across all 21 courses, which suggests one canon growth event, but I did not confirm that.
- **The 144 `no-voice` pairings** are courses with no target voice resolvable at all. Most are the `_for_jpn` / `_for_zho` courses with no stored config. Counted, not investigated — outside this brief.

## What this implies for a screen, in one line

The Voice Lab's Languages panel shows draft slots per language; it has no way to show that one voice occupies four of them. I have not touched that screen.
