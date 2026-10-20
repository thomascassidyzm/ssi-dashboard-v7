# Speakability tagging codebook (job #171)

Work product for one fan-out: inputs/ are live pulls (Popty :3470, 2026-10-20), tags/ are the
workers' outputs, the published grid is built from tags/. Nothing here is course content or a
statement about how the system works.

## Layer (one primary, optional secondary) — Tom's Speakability Layers (Jan 2026)

| L | Name | Tag it when the utterance's POINT is… |
|---|------|------|
| 0 | Meta | language, learning, or the talk itself: repair ("sorry, didn't catch that", "say that again", "what does X mean"), word-search, comprehension checks, talk about learning/practising/speaking, mistakes |
| 1 | Basic Needs | physical/emotional state, needs, food/drink, offers and requests of things, time/availability, leaving, simple logistics (where, when, how to get there) |
| 2 | Contributing | joining in without a developed view: reactions ("That's brilliant!", "Oh no"), agreement/assent, thanks, apologies, greetings/farewells, backchannels, reassurance, short accept/decline, small redirects ("anyway…"), light topic-starters |
| 3 | Self & Perspectives | the speaker's own opinions, preferences, likes, beliefs, experiences, plans, news about themselves |
| 4 | Involving Others | a third party is the subject, or reported speech/thought ("he said", "she thinks", "my son works…") |
| 5 | Sophisticated | abstract ideas, argument, hypotheticals/counterfactuals, nuanced concession, general claims about the world |
| 6 | Register | the point is formality/addressee marking: sir/madam, "you all", formal you |

Tie-break when two fit (pick the first in this order): **6 > 0 > 1 > 2 > 5 > 4 > 3**. Put the
runner-up in `layer2` if it is genuinely also there; else leave blank. A short formulaic reaction
is 2 even if it contains "I" ("I know." "I hope so."). Questions take the layer of what they ask
about ("How's your mum?" = 4; "How are you?" = 2 greeting-ritual; "What do you think?" = 3).

## Q / R / S (exactly one)

- **Q** — elicits a reply: any question, request, offer, invitation, suggestion-as-question
  ("Shall we…?", "Could you say that again?", "Do you want a coffee?").
- **R** — responds to something just said: answers, reactions, acceptances/refusals, thanks for
  something offered, agreement, repair given ("Sara. From the old office.").
- **S** — initiates or adds unprompted: news, assertions, opinions, stories, announcements,
  greetings that open.

For SEEDS (no context): R only when the sentence is inherently responsive in form — begins with
or is a yes/no/thanks/agreement/acceptance ("No I don't mind at all", "Yes that's a good idea",
"No problem", "Thank you very much, but…", "But I was wrong" is S). Otherwise Q if interrogative
or a request, else S. A fragment seed ("how to speak as often as possible") is S unless it reads
as a question.

For POD rows: judge in context. A row that both answers and then asks back is tagged by its
LAST clause for qrs ("Most mornings, yes. … And you?" = Q) and the move field records both
(`answer+reciprocal-return`).

## Move (pods only) — the row's job in the conversation flow

Use these labels; join two with `+` when a row does two jobs in order. Invent a new label only if
none fits, and list every invented label at the top of your output file's notes.

opening-greeting · recognition (spotting/naming someone) · how-are-you · how-are-you-answer ·
news-request (topic question) · news-telling · follow-up-question · answer · elaboration ·
reaction-positive · reaction-sympathy · reaction-surprise · backchannel · agreement ·
disagreement · hedge · opinion · story · repair-request (didn't hear/understand) · repair-give
(repeat/clarify) · word-search · check-understanding · reciprocal-return ("and you?", "enough about
me — how's…") · topic-shift · topic-close · offer · accept · decline · request · grant ·
refuse · thanks · thanks-response · apology · apology-response · compliment ·
compliment-response · suggestion · plan-making · arrangement-confirm · contact-exchange ·
pre-closing ("anyway, I'd better go") · closing-farewell · introduction · invitation ·
advice · complaint · reassurance · joke-banter

## Output (TSV, one line per input row, same order, header line first)

Seeds: `seed_id	layer	layer2	qrs	note`
Pods:  `row	layer	layer2	qrs	move	note`

`note` is optional and short (≤12 words) — use it only for a genuinely uncertain call.
