# Pods, end of the day: translations done, audio still gated, four defects found

*Live database, 2026-08-14. Where this disagrees with any audit doc in the repo, the database wins.*

## Where it got to

**The translation pass is complete.** 4,161 lines across 37 courses and 33 languages, translated from the English canon and written to the database as provisional drafts. Nothing learner-facing moved: every line landed with `target_text_draft = true` on the staging pod, which the player never reads.

**No audio has been generated.** The `pod_voice_approvals` row is still an empty object, so every render on the estate refuses with `no_approval`. That is the one thing still waiting on you, and it is a one-word decision — the whole remaining render costs **$4.48**.

The only translation work left is **229 lines you have to rule on**: `spa_mx` 117 and `deu` 112, where the text exists in a sibling variant. Carrying it across would push Iberian Spanish into the Mexican course and Austrian German into the standard German one. That is your ear, not a script's.

## Four defects, in the order they matter

### 1. Annotations in released learner-facing pods, with audio already rendered

**34 lines across three released courses carry a slash alternative in the text a learner hears.**

| course | status | lines | audio linked |
|---|---|---:|---:|
| `pol_for_eng` | beta | 26 | 26 |
| `por_for_eng` | **live** | 6 | 6 |
| `ara_for_eng` | beta | 2 | 2 |

They read like this:

- `Dzień dobry. Jak się Pan/Pani ma?`
- `Nie jestem pewny/pewna, czy jestem głodny/głodna. Czy macie menu?`
- `ainda me sinto um pouco nervoso/a a falar com outras pessoas`
- `مساء الخير. عايز/عايزة إيه؟`

A slash offering two genders or two registers is an annotation, and the rule is zero explanation — everything learnt by example in context. Worse, this is spoken content: **every one of these has a clip against it**, so a voice has already read `pewny/pewna` aloud as something. There is no reading of `nervoso/a` that a person says.

I have not touched them. The text is live, the audio is linked, and changing text under an existing clip is the make-before-break rule pointing the other way — you would get a course whose text and audio disagree. This needs a plan, not a quiet edit.

### 2. Register: informal address to strangers, found in five languages

Applying "tu-first" literally produced a bartender being asked `У тебе є якісь снеки?` and a hotel receptionist telling a guest `у тебе двомісний номер`. In Ukrainian that is not casual, it is wrong.

Repaired: **Ukrainian** (29 of 109 lines), **Polish** (25 of 123), and **Armenian, Estonian and Latvian** in flight. Croatian, Italian, Lithuanian and Finnish got it right unprompted.

The working rule, which is your own rail rather than a departure from it — tu-first *unless context insists*, and a stranger in a service role is context insisting:

> **The polite form for strangers and service roles, in both directions — customer to staff and staff to customer. The informal form only for the personal thread: friends, the Sarah lines, the language-practice conversation, and emotional statements.**

One sentence from you confirming that reading settles every T-V course on the estate instead of eleven separate flags.

**Armenian, Estonian and Latvian were worse than wrong — they were inconsistent.** All three mixed both registers inside the same bar scene: `Kas sul on toitu?` next to `Milliseid õllesid teil`. One intention, two forms, which is the fork ZUT exists to prevent.

### 3. Two bugs in my own tooling, both caught by workers not trusting it

**The queue silently shrank.** `pod-translation-batch.cjs extract` excluded lines "already filled" keyed on `target_lang`, which lumps dialects. A line translated in Egyptian Arabic counted as covered for MSA. **47 lines estate-wide would have stayed blank with nothing recording they were missing** — MSA short by 17, plus Syrian 12, Quebecois 10, French 9, Portuguese 7. Found by a worker cross-checking the database's actual blank rows against the tool's count instead of believing it. Fixed and all 47 translated.

An over-reporting queue wastes a little work. An under-reporting one leaves a hole no downstream check can see.

**The script gate manufactured a misspelling.** U+200C, the Persian half-space, is ordinary orthography and is in neither `\p{M}` nor `\p{P}`, so the gate rejected 66 of 122 Persian lines as "not arabic script" when every one of them was. The worker stripped the character to get past it, which fused `یه‌کم` into `یهکم` — a real error the gate then passed happily. A gate that rejects correct text and accepts what you replace it with is worse than no gate: it manufactures the defect it cannot see. Fixed; 162 existing Persian rows carry ZWNJ, so stripping it was also making new lines inconsistent with the ones beside them.

### 4. A systematic blank row

39 rows, one per course, every one at `global_order` 90142 with empty known text. A single bad insert across the estate. Not translation debt, and left alone.

## What the QA model did and did not catch

Graduated sampling worked for per-line quality — it caught a Persian fusion error, a Ukrainian translationese copula, a Basque number-agreement wobble.

**It cannot catch cross-line inconsistency, and neither can the ZUT check.** Sampling reads lines one at a time, and each Estonian line was individually fine. The mechanical ZUT check compares *identical* English, and here the English differed while the situation did not — I ran it estate-wide and it returned zero. The register fault lives exactly between the two, and it was only visible reading service lines side by side across languages.

So the cheap fix is not a higher sample rate. It is a per-language register-consistency check over service lines, which would find all of it mechanically for nothing.

## Still to do

- **Your word on the render.** Spanish first: already two voices (Elvira and Alvaro, verified directly), 397 units, nothing needed before it renders.
- **The 229-line dialect call** on `spa_mx` and `deu`.
- **The annotation cleanup** above — 34 lines, released, audio linked.
- **The recast**, half done: 50 of 103 pods still carry three to six voices, Korean at six. Recast first, approve after, then render, because the approval is keyed to a cast fingerprint.
- `cym_s_for_eng` still serves 104 unproofread machine-drafted lines to learners. Flagged 2026-08-13, still true.
- 409 TTS clips still sit on Welsh courses, 190 on a Japanese voice. All predate the exclusion; the guard blocks new ones. Deletion needs a plan.
- Plate item A-105 is still open.

## Calls made, standing

Finnish `te`/`sinä` by context, Egyptian Arabic plural address to an establishment, and masculine defaults where English gives no gender cue — all confirmed to stand. Thai has no T-V axis at all: politeness rides on `ครับ`/`ค่ะ`, which mark the *speaker's* gender, so every line defaulted to `ครับ` and any female-voiced line needs a re-tag against the casting sheet — a re-tag, not a retranslation.
