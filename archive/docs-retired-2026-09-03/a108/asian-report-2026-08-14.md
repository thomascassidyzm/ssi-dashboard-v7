# A-108 Asian — jpn, kor, zho, tha

**414 staged drafts examined. 86 lines changed, 85 of them Thai. The whole Thai draft set had been written in a man's voice for a cast that is mostly women — that is the finding.**

Applied 2026-08-14 against Tom's three A-108 rules. Logs with every row:
`docs/a108/asian-tha-applied-log.json`, `docs/a108/asian-zho-applied-log.json`.

## The counts

| Course | Drafts examined | Register (rule 3) | Gender (rule 2) | Annotations (rule 1) |
|---|---|---|---|---|
| jpn_for_eng | 106 | 0 | 0 | 0 |
| kor_for_eng | 101 | 0 | 0 | 0 |
| zho_for_eng | 101 | **1** | 0 | 0 |
| tha_for_eng | 106 | 0 | **85** | 0 |

Rule 1 came back empty in all four: not one parenthesis, slash form or bracketed gloss
in 414 target lines.

## Thai — 85 lines, rule 2

Thai politeness particles and the first-person pronoun are gendered **to the speaker**.
Every Thai draft had been written male — 99 instances of `ครับ`, zero `ค่ะ`/`คะ` — against
a cast in which the four speakers who own those lines are all women:

| Speaker | Cast voice | Lines fixed |
|---|---|---|
| Learner | Ara | 66 |
| Sarah | Aroon | 8 |
| Barista | Ara | 6 |
| Neighbour | Eve | 1 |

The transform, applied per line and eyeballed on all 85:

- `ครับ` ending a **statement** → `ค่ะ`; ending a **question** → `คะ` (decided per
  space-delimited clause on `ไหม / หรือเปล่า / เท่าไหร่ / ที่ไหน / อะไร / …`)
- `นะครับ` → `นะคะ`
- `ผม` → `ฉัน` — the course's own established female first person; non-draft Anna already
  says `ฉันชื่อแอนนาค่ะ`. (`ดิฉัน` would have been the formal-register choice; `ฉัน` is the
  everyday counterpart of `ผม` and matches what the pod already teaches.)

This is not my inference against the grain of the course — the **non-draft** Thai rows
already do it correctly. Sarah says `สวัสดีค่ะ เป็นยังไงบ้างคะ`, the Barista says
`สวัสดีค่ะ รับอะไรดีคะ`, the Neighbour `สวัสดีค่ะ`. The drafts were the regression, and
they are now back in line with the scene around them.

**Left male, correctly:** Bartender, Driver, Guest (all cast Krit), and Passenger /
Customer 1 / Customer 2, which resolve to the male `_default`. 12 draft rows still carry
`ครับ` and every one of them is a male-voiced speaker.

## Chinese — one line, rule 3's exception

`zho_for_eng:pod-0-unrecorded:SC11-S002`, Receptionist, hotel check-in:

> 欢迎。是的，**你**订了一间双人房，住三晚。我可以看一下**你**的证件吗？
> 欢迎。是的，**您**订了一间双人房，住三晚。我可以看一下**您**的证件吗？

This is exactly the flattening Tom's exception clause guards against. The rest of scene 11
uses `您` (the original of this very line, and `祝您入住愉快` at S012), as does the restaurant
Waiter at SC09-S003. Hotel staff to a guest is `您` in Mainland usage; the redraft dropped it.
Fixed in place, the draft's own wording otherwise untouched.

**Nothing else in Chinese moved, and nothing else should.** The café, bar and taxi scenes use
`你` throughout, in drafts and non-drafts alike — that is the correct Mainland register for
casual service, not a flattening. `您` in a café would be wrong in the other direction.
Chinese has no speaker-gender agreement, so rule 2 has no surface to act on.

## Japanese — nothing, and that is the right answer

Japanese has no T-V pair; it has a politeness axis (`です/ます` vs plain). The **entire** pod —
374 lines, drafts and non-drafts, peer scenes and service scenes alike — is `です/ます`, and
the drafts are consistent with the scenes they sit in.

Mapping Tom's rule 3 onto that axis: plain form to a *neighbour* or a *newly-met traveller*
is not the Japanese equivalent of `tu`, it is rudeness. Scenes 1, 5 and 6 are the neighbour,
the neighbour again and two strangers introducing themselves — `です/ます` is the only correct
register for all three, and it is what is there. Scene 4's Friend and scene 22's practice
partner would tolerate plain form, but three draft lines sit inside scenes whose other 30
lines are `です/ます` and are out of scope; flipping the drafts alone would have produced a
speaker who changes register mid-conversation. **No change, deliberately.**

Rule 2: Japanese marks speaker gender in pronouns and final particles (`僕/俺`, `だわ`, `かしら`),
not in agreement. None appear anywhere in the 106 drafts — the Learner uses the neutral `私`,
which is correct for the female Ara voice. Nothing to do.

## Korean — nothing, and that is the right answer

Same shape. The pod is uniformly `해요체`, with `합니다체` appearing only where it should — the
restaurant Waiter (`메뉴판 여기 있습니다`), non-draft. There is **no 반말 anywhere in the pod**, and
there should not be: `해요` to a neighbour, to a new acquaintance and to a barista is all
correct, and 반말 to any of them would be an insult, not informality. Korean has no gender
agreement. Rule 2 and rule 3 both come back empty on the language, not on the sweep.

## Named gaps — things I found and did not touch

**1. The Thai cast can no longer name half its own speakers.** Five sentence speakers —
`Customer`, `Customer 1`, `Customer 2`, `Customer 3`, `Passenger` — have **no entry** in
`listening_pods.speakers` for tha. Phase 8 resolves them via `mapping[canon] || mapping[speaker]
|| mapping._default`, so all five fall through to `_default` = Krit, **male**. The cast keys that
were clearly meant for them are scene-specific and female: `Cafe customer 1/2/3`,
`Bar customer 1/2/3`, `Diner 1/2`, `Bus passenger`, `Taxi passenger`. Consequence: **18 non-draft
Thai rows are written with female particles for speakers that will render in a male voice.** I
left the matching draft rows male, because male is what the cast actually resolves to today —
but the right fix is to the cast, not the text, and it decides those 18 rows too. This needs a
ruling before anyone renders tha pod-0.

**2. The Thai gender defect is not confined to the drafts.** Six non-draft Learner lines in
scene 22 still say `ผม` (`ผมเรียนมาไม่นานมาก`, `ผมต้องเรียนคำศัพท์เพิ่ม`, …) for the female
Ara-voiced Learner — the same defect I just fixed 66 times one scene earlier. A draft-only sweep
cannot close it. Same finding the Nordic pass reported for Icelandic.

**3. Cast rows whose declared gender contradicts their voice.** jpn `Barista: gender f` is cast
with Ren (`b1a7441b97a1`), the voice used for every male jpn role; zho `Barista: gender f` is cast
with Jian, likewise. Harmless in these two languages because neither marks speaker gender in the
text — but it would matter the moment either cast is reused for a language that does.

**Outside the three rules, so untouched:** kor SC02-S005 renders "three or four miles" as
`5-6킬로미터` while the same pod keeps pounds and pints; kor SC15-S009 renders "your language" as
`그 나라 언어` ("that country's language"); jpn SC04-S003 opens a refusal with a stiff `いいえ`.
Translation-quality items for a different pass.

## Confidence

**High** on Thai rule 2. The particle and pronoun system is mechanical, the cast is unambiguous,
and the course's own non-draft rows corroborate every one of the 85 edits. I am **not** claiming
native-level judgement on Thai idiom or word choice across the 106 drafts — I changed gender
marking and nothing else.

**High** on the Chinese line: `您` from hotel reception is settled usage and the scene's own
non-draft rows prove the intent.

**High** on the Japanese and Korean nulls for rules 1 and 3 — the checks are mechanical and the
register reasoning is elementary for both languages. Rule 2 is structurally inapplicable to
Chinese, Japanese and Korean, so those zeros are facts about the languages, not gaps.

## Hygiene

Gated writes only: exact before-text equality in every `WHERE`, a PL/pgSQL guard raising inside
the transaction, commit only on guard pass, re-queried after. Thai draft count after the write is
106 — unchanged — with exactly 85 rows' `updated_at` moved; zho 101 with one. `target_text_draft`
preserved on every row; the `PATCH /sentence/:sentenceId` route was not used. **No audio generated.**
