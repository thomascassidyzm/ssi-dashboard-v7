# Pod 0 — speaker-label inference audit (spa_for_eng:pod-0-unrecorded)

**Date:** 2026-08-08 · **Scope:** all 232 rows of `listening_pod_sentences` where `pod_id = spa_for_eng:pod-0-unrecorded` · **Read-only:** no database writes, no TTS.
**Machine-readable companion:** `docs/pods/pod0-speaker-inference-audit-2026-08-08.json` (232 objects).

## The headline fact

**The canonical Pod-0 script carries no speaker labels at all.** `scripts/pod0-canonical-source-2026-08-06.txt` is 22 scenes of numbered sentences under scene titles; grepping it for any `Name:` prefix returns exactly one hit, the `Source:` metadata line at the top. Every `speaker` string in the live table — `Sarah`, `Barista`, `Customer 1`, `Learner`, all 26 distinct values — was **invented by the draft-writing run**, not read out of the canon. Casting Pod 0 by speaker therefore rests on inference, not on data, for 230 of 232 rows.

## Bucket counts

| Verdict | Rows | Share |
|---|---:|---:|
| **EXPLICIT** — the canon names the speaker | **2** | 0.9% |
| **INFERRED-HIGH** — turn structure or role-only content fixes the speaker | **204** | 87.9% |
| **INFERRED-UNCERTAIN** — a defensible person could disagree, or the label looks wrong | **26** | 11.2% |
| **Total** | **232** | |

The only two EXPLICIT rows are scene 6 lines 2 and 3 — *"My name is Anna"* (global 26) and *"I'm James"* (global 27) — where the sentence names its own speaker. Nothing else in 231 canonical sentences does. I counted role-fixing content (*"What can I get you?"* → staff; *"I haven't been learning for very long"* → the learner) as INFERRED-HIGH, not EXPLICIT, because the canon still never says who the character is.

**Speaker labels I propose changing: 13.**

## Scenes 15–21, the "Extra phrases" scenes — the important finding

Scenes 15-21 hold 80 rows: 73 drill lines plus 7 numbers/months narrator tails. The draft run labelled **all 73 drill lines** `Learner`. Going line by line, **61 are genuinely learner-side** (first-person statements, customer requests, questions a visitor asks), **11 are the other side of an exchange** and cannot be the learner, and 1 is undecidable:

| # | Line | Why it is not the learner |
|---:|---|---|
| 160 | No, we only take cash. | The venue refusing the card offered one line earlier. |
| 164 | Do you want to pay by cash or card or put it on the room? | Only the hotel/venue can offer a room charge. |
| 166 | Would you like to pay by cash or card or on the room? | Politeness variant of the same staff question. |
| 167 | Did you want to pay by cash or card? | Softened variant of the same staff question. |
| 171 | No, it's a little cold today. | Answers the learner's "Is the water warm?". |
| 211 | It's down there on the left. | Directions answering "where is the toilet". |
| 212 | It's down there on the right. | Same, other variant. |
| 214 | Yes, I said it's over there. | Repeats directions the speaker themselves just gave. |
| 217 | Would you like to order some drinks? | Waiter/host offering. |
| 218 | Do you want to order some drinks first? | Variant of the same offer. |
| 219 | Did you want something to drink first? | Variant of the same offer. |

Of those, 171 is the one I mark as arguable rather than plainly wrong. One further extra-phrase row, **172 "It's not bad."**, is genuinely undecidable from the text and stays `Learner` under protest.

Scenes 18, 19 and 20 are clean: every one of their 30 lines is first-person learner content or a customer request, so `Learner` is right throughout. Scene 15 is clean too.

## Scenes 7, 8, 9 — is the Customer 1/2/3 numbering defensible?

- **Scene 7 (coffee shop): defensible.** Three transactions run to completion in sequence — order→size→takeaway (customer 1), a fresh order→upsell→total→payment (customer 2), then a new *"Good morning"* restart (customer 3). Each boundary is marked in the text by a completed payment or a fresh greeting. All 14 rows land INFERRED-HIGH.
- **Scene 8 (pub): mostly arbitrary.** Only the chains are derivable — ales→bitter is one drinker, wine-list→white-wine is another. Which member of the round says *"Can I have a small glass of red wine?"*, *"I'd like two more glasses of beer"*, the menu request, the bread order or the sandwich order is **not fixed by anything in the text**; and nothing says the wine-drinker is a third person rather than the second one again. Six rows (58, 61, 62, 64, 66, 67) are INFERRED-UNCERTAIN on this basis.
- **Scene 9 (restaurant): the party size is derivable, the per-line split mostly is not.** *"a booking for two"* fixes exactly two diners, and *"And the risotto for me"* (78) explicitly contrasts with the lamb order (77), so those two lines really are different people. The other seven customer lines — water, dietary question, recommendation request, wine list, house red, coffees, bill — could be either diner; the alternation reads plausible but is authored, not derived. Seven rows INFERRED-UNCERTAIN.

Under Tom's casting rule this matters less than it looks: two voices per scene, with the third-or-later character recycling voice 1. What it does mean is that scene 8's three-way split should not be treated as evidence of three distinct people.

## Two data defects worth noting

1. **Row `SC15-S012` (global_order 90142) is empty** — blank `known_text` and `target_text`, labelled `Narrator`, with an out-of-band global_order. This is why the table has 232 rows against the canon's 231 sentences. It has nothing to speak and should not be cast.
2. **Scene 1 splits one character across two label strings** — line 1 is `Neighbour (8 am)` and line 3 is `Neighbour`. Cast strictly by speaker string, that one neighbour would get two voices inside a four-line scene. Proposed: normalise line 1 to `Neighbour`. The other time-tagged labels (`Barista (3 pm)`, `Friend (7 pm)`, `Neighbour (10:30 pm)`) are cosmetic only — each is the sole non-Sarah speaker in its scene, so no clash — and I have not proposed changing them.

## Every INFERRED-UNCERTAIN line

| # | Scene | Text | Current | Proposed | Reason |
|---:|---:|---|---|---|---|
| 58 | 8 | Could I see the wine list? I want a glass of wine. | Customer 3 | *(unchanged)* | Nothing in the text says the wine-drinker is a third person rather than customer 2 again; the boundary is arbitrary. |
| 61 | 8 | Can I have a small glass of red wine? | Customer 1 | *(unchanged)* | Red wine after already ordering a pint of bitter; which member of the group says it is arbitrary. |
| 62 | 8 | I'd like two more glasses of beer. | Customer 2 | *(unchanged)* | "two more glasses of beer" could be any member of the round; the allocation is arbitrary. |
| 64 | 8 | I'm not sure if I'm hungry. Do you have a menu? | Customer 1 | *(unchanged)* | Answers the staff question on behalf of the group; which customer is arbitrary. |
| 66 | 8 | Can we have some bread? And a bowl of chips for the table. | Customer 1 | *(unchanged)* | Group order for the table; plausibly the same speaker as the menu request, but not fixed by the text. |
| 67 | 8 | Do you have any sandwiches? I'd like a cheese sandwich, please. | Customer 2 | *(unchanged)* | Sandwich order sits with any group member; the allocation is arbitrary. |
| 72 | 9 | We'd like one bottle of sparkling water and one bottle of still water, please. | Customer 2 | *(unchanged)* | Either diner could order the table's water; the split between customer 1 and 2 is arbitrary here. |
| 73 | 9 | Excuse me - do you have anything gluten-free? Or for vegetarians? | Customer 1 | *(unchanged)* | Dietary question could come from either diner; arbitrary allocation. |
| 75 | 9 | And what would you recommend tonight? | Customer 1 | *(unchanged)* | Either diner could ask for a recommendation; arbitrary allocation. |
| 80 | 9 | Could we see the wine list? | Customer 1 | *(unchanged)* | Either diner could ask for the wine list; arbitrary allocation. |
| 81 | 9 | A bottle of the house red would be lovely. | Customer 2 | *(unchanged)* | Either diner could choose the house red; arbitrary allocation. |
| 84 | 9 | Just two coffees, please. Decaf for me. | Customer 1 | *(unchanged)* | "Decaf for me" distinguishes the speaker from their companion but does not say which diner it is. |
| 85 | 9 | And the bill, when you're ready. Could we split it? | Customer 2 | *(unchanged)* | Asking for the bill could be either diner; arbitrary allocation. |
| 160 | 16 | No, we only take cash. | Learner | **Staff** | "No, we only take cash" is the venue refusing the card just offered — the interlocutor, not the learner. |
| 164 | 17 | Do you want to pay by cash or card or put it on the room? | Learner | **Staff** | Offering the room-charge option is the hotel/venue asking the guest, not the learner. |
| 166 | 17 | Would you like to pay by cash or card or on the room? | Learner | **Staff** | Politeness variant of the staff payment question, not a learner line. |
| 167 | 17 | Did you want to pay by cash or card? | Learner | **Staff** | Past-tense-softened variant of the same staff payment question. |
| 171 | 17 | No, it's a little cold today. | Learner | **Interlocutor** | "No, it's a little cold today" answers the previous question, so it reads as the other party. |
| 172 | 17 | It's not bad. | Learner | *(unchanged)* | Could be the learner's comment or the interlocutor continuing; the text does not decide. |
| 211 | 21 | It's down there on the left. | Learner | **Interlocutor** | Directions answering "where is the toilet" — only the person who knows the place says this. |
| 212 | 21 | It's down there on the right. | Learner | **Interlocutor** | Directions variant answering the same question — the other party. |
| 214 | 21 | Yes, I said it's over there. | Learner | **Interlocutor** | "Yes, I said it's over there" repeats the directions just given, so it is the direction-giver. |
| 217 | 21 | Would you like to order some drinks? | Learner | **Interlocutor** | "Would you like to order some drinks?" is the waiter/host offering, not the learner. |
| 218 | 21 | Do you want to order some drinks first? | Learner | **Interlocutor** | Variant of the same drinks offer, so the same non-learner speaker. |
| 219 | 21 | Did you want something to drink first? | Learner | **Interlocutor** | Softened variant of the same drinks offer — the waiter/host. |
| 90142 | 15 | *(empty)* | Narrator | **(empty row — no speaker)** | Blank row SC15-S012 with empty known and target text; it carries a Narrator label but has nothing to speak. |

## Method and honesty note

Verdicts were assigned by reading each line against the canonical scene it sits in and its immediate neighbours. Nothing here is derived from a speaker field in the source, because there is none. **Most of this pod's casting is inference: 230 of 232 rows.** The 204 INFERRED-HIGH rows are inference I would defend without hesitation — clean two-hander alternation, or a line only one role can utter — but they are still inference, and any future re-cast that disagrees with one of them is disagreeing with a reading, not with a record.
