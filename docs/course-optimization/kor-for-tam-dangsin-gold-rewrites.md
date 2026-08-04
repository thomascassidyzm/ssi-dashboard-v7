# kor_for_tam — proposed rewrites for 당신 in gold seed targets

**Status:** awaiting Kai's approval. Nothing written to the DB.
**Date:** 2026-07-21
**Scope:** 41 of 668 gold seed `target_text` rows contain 당신 (6.1%).

## Why this is needed

당신 is not a neutral second-person pronoun in Korean. It belongs to spouses, to
hostile confrontation (당신 뭐라고 했어?), and to written/advertising/translationese
register. Said to a conversation partner's face in 해요체 it reads as intimate,
aggressive, or machine-translated. A Tamil learner drilled on it will offend people.

The course calibration already settled this — golden seed 1 renders உங்களோடு
("with you") as **같이**, pronoun dropped entirely. These 41 rows contradict the
calibration.

This is a **translation defect, not a build defect**. Earlier builders were
faithfully decomposing these targets; seeds 11/20/30/31 are the four that fall in
already-built range and are the source of all 63 built 당신 phrases.

## Why a builder cannot fix it

The API validates tiling against `seed target_text`. If the gold says 당신에게 and
no LEGO covers it, submission fails. Fixing requires PATCHing the gold rows —
a translation-level edit to canonical content.

## The three repair patterns

1. **Drop + honorific `-시-`** (most cases). Korean marks the addressee on the verb,
   not with a pronoun: `당신이 끝낸 후에` → `끝내신 후에`.
2. **Drop + humble `드리다`/`-어 드리다`** where the verb already encodes the
   recipient: `당신에게 시간을 드리고` → `시간을 드리고`. Adding 당신에게 to 드리다
   is both register-wrong *and* redundant.
3. **`선생님` / `-분`** where an explicit address term genuinely disambiguates
   (kinship terms, where dropping would make "whose brother?" unclear).

## Proposed rewrites

| Seed | Current | Proposed | Pattern |
|---|---|---|---|
| S0011 | 당신이 끝낸 후에 말할 수 있으면 좋겠어요. | 끝내신 후에 말할 수 있으면 좋겠어요. | 1 |
| S0020 | 당신은 그의 이름을 빨리 배우고 싶어 해요. | 그의 이름을 빨리 배우고 싶으세요. | 1 |
| S0030 | 어제 당신에게 뭔가 물어보고 싶었어요. | 어제 뭔가 물어보고 싶었어요. | 1 |
| S0031 | 당신은 오늘 밤 저와 이야기하고 싶어 했어요. | 오늘 밤 저와 이야기하고 싶어 하셨어요. | 1 |
| S0054 | 우리는 당신에게 시간을 조금 더 드리고 싶었어요. | 우리는 시간을 조금 더 드리고 싶었어요. | 2 |
| S0062 | 동시에 당신을 도울 수 있을지 모르겠어요. | 동시에 도와드릴 수 있을지 모르겠어요. | 2 |
| S0107 | 당신이 무엇을 하고 있었는지 보고 싶었어요. | 무엇을 하고 계셨는지 보고 싶었어요. | 1 |
| S0125 | 당신의 생각이 매우 좋았다고 믿어요. | 그 생각이 매우 좋았다고 믿어요. | 1 |
| S0127 | 그게 당신을 만나고 싶었던 이유가 아니에요. | 그게 만나고 싶었던 이유가 아니에요. | 1 |
| S0129 | 당신이 잘 하고 있어서 정말 기뻐요. | 잘 하고 계셔서 정말 기뻐요. | 1 |
| S0142 | 당신은 매우 친절하시고 도움을 주셔서 감사해요. | 매우 친절하시고 도움을 주셔서 감사해요. | 1 (already had -시-) |
| S0152 | 당신이 원하는 것을 알았다면 다르게 했을 거예요. | 원하시는 것을 알았다면 다르게 했을 거예요. | 1 |
| S0178 | 시간이 없었어요, 비록 당신을 보고 싶었지만요. | 시간이 없었어요, 비록 보고 싶었지만요. | 1 |
| S0204 | 그녀가 당신이 준비를 처리하는 것을 도와주길 원했어요. | 그녀가 준비를 처리하는 걸 도와드리길 원했어요. | 2 |
| S0206 | 당신과 함께 말하는 연습을 할 기회가 즐거워요. | 같이 말하는 연습을 할 기회가 즐거워요. | 1 (matches golden S1) |
| S0208 | 어떻게 말하는지 당신에게 물어보고 싶지 않았어요. | 어떻게 말하는지 물어보고 싶지 않았어요. | 1 |
| S0223 | 그는 내일 당신에게 물어볼 거예요. | 그는 내일 물어볼 거예요. | 1 |
| S0225 | 그가 할 수 있다면 당신에게 대답을 줄 거예요. | 그가 할 수 있다면 대답을 드릴 거예요. | 2 |
| S0229 | 그 여자는 할 수 있다면 당신을 도울 거예요. | 그 여자는 할 수 있다면 도와드릴 거예요. | 2 |
| S0230 | 당신과 함께 일하고 싶어 하는 젊은 남자를 알아요. | 같이 일하고 싶어 하는 젊은 남자를 알아요. | 1 |
| S0233 | 당신의 언니를 아는 젊은 여자를 알아요. | 선생님 언니를 아는 젊은 여자를 알아요. | 3 (kinship needs owner) |
| S0234 | 어젯밤에 당신의 형과 함께 일하는 사람을 만났어요. | 어젯밤에 선생님 형과 함께 일하는 사람을 만났어요. | 3 |
| S0235 | 당신에게 무언가를 말하고 싶다고 한 사람을 만났어요. | 무언가를 말하고 싶다고 한 사람을 만났어요. | 1 |
| S0237 | 그는 주말 전에 당신에게 말해주길 원했어요. | 그는 주말 전에 말해주길 원했어요. | 1 |
| S0238 | 그는 어제 당신이 저에게 말해주길 원했어요. | 그는 어제 저에게 말해주시길 원했어요. | 1 |
| S0246 | 그녀가 당신을 도와주길 원했지만 너무 바빴어요. | 그녀가 도와드리길 원했지만 너무 바빴어요. | 2 |
| S0294 | 오늘 밤 당신에게 전화할 시간이 충분하지 않아요. | 오늘 밤 전화할 시간이 충분하지 않아요. | 1 |
| S0301 | 그는 당신에게 무언가를 보여주고 싶다고 말했어요. | 그는 무언가를 보여드리고 싶다고 말했어요. | 2 |
| S0334 | 그는 당신이 새끼 고양이를 안게 해줄 수 있다고 말했어요 | 그는 새끼 고양이를 안게 해드릴 수 있다고 말했어요 | 2 |
| S0344 | 당신을 기꺼이 도와주겠다고 말한 사람이요. | 기꺼이 도와드리겠다고 말한 사람이요. | 2 |
| S0355 | 그녀가 당신이 아는 그 여자와 이야기해야 했어요? | 그녀가 아시는 그 여자와 이야기해야 했어요? | 1 |
| S0358 | 당신 친구는 꼭대기에 닿을 수 없었다고 말했어요. | 친구분은 꼭대기에 닿을 수 없었다고 말했어요. | 3 (-분) |
| S0359 | 당신 친구는 왼쪽으로 돌 수 있었다고 말했어요. | 친구분은 왼쪽으로 돌 수 있었다고 말했어요. | 3 |
| S0362 | 아니요, 당신이 떠난 후 꽤 조용했어요. | 아니요, 떠나신 후 꽤 조용했어요. | 1 |
| S0388 | 당신과 함께 일하는 그 사람이요. | 같이 일하는 그 사람이요. | 1 |
| S0427 | 그들은 당신이 그들이 지루하다고 생각하길 원하지 않아요. | 그들은 자기들이 지루하다고 생각하시길 원하지 않아요. | 1 |
| S0432 | 그들이 당신에게 물어보길 원한다는 뜻일 수도 있어요. | 그들이 물어보시길 원한다는 뜻일 수도 있어요. | 1 |
| S0486 | 당신의 눈이 아름답다고 생각해요. | 눈이 아름답다고 생각해요. | 1 |
| S0533 | 그녀는 당신이 하는 모든 말을 듣지 않을 거예요. | 그녀는 하시는 모든 말을 듣지 않을 거예요. | 1 |
| S0545 | 깨끗한 옷을 위층으로 가져가는 것이 당신 차례예요. | 깨끗한 옷을 위층으로 가져갈 차례예요. | 1 |
| S0564 | 당신의 도움 없이는 할 수 없었을 거예요. | 도움 없이는 할 수 없었을 거예요. | 1 |

## Rows I am least confident about — please check these first

- **S0233 / S0234** (kinship). Dropping the possessive makes "whose sister/brother?"
  genuinely ambiguous, so I used 선생님. If the course's register does not want
  선생님 this early, these two may need rephrasing instead.
- **S0486** (당신의 눈이 아름답다고 생각해요). A compliment about someone's eyes with
  the pronoun dropped is natural Korean, but the register question is whether this
  sentence belongs in the course at all in this form.
- **S0427** — the original is doubly confusing (당신 + 그들이 twice). I rewrote 그들이
  as 자기들이 for clarity; that is a bigger change than a pronoun drop.
- **S0545** — restructured to 가져갈 차례예요 rather than a pure deletion, because
  당신 차례 → 차례 alone reads oddly.

## Downstream once approved

1. PATCH the 41 gold `target_text` rows.
2. Rebuild seeds **11, 20, 30, 31** (the four in built range) — LEGO-level 당신,
   ~63 phrases derived from them.
3. Seeds 54 and 62 are currently **skipped** by the builder and can be built normally.
4. The remaining 35 are unbuilt and will build clean.

No TTS has been generated for this course, so all of this is free and reversible.
