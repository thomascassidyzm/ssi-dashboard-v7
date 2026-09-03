# Steve's Senedd/S4C pod — built, held, and in Aran's queue

Built 3 September 2026. Source: the Welsh Parliament's own bilingual XML export of the
Culture, Communications, Welsh Language, Sport and International Relations Committee,
11 January 2024, agenda item 8 — *Allegations concerning bullying at S4C: evidence session with S4C*.

## The two numbers

**760 lines for Aran to read. About 2 hours 40 minutes of actual reading.**

- The pod holds **399 paired rows** — each one a Welsh line beside the English that
  actually corresponds to it. Both sides get recorded, so that is **798 recordable
  slots**; 38 of them are exact repeats of another line ("Diolch." / "Thank you."), and
  the queue collapses those into one reading each. Hence 760 distinct lines, 383 Welsh
  and 377 English, filling all 798 slots.
- 2h40m is the estate's own estimate (3 seconds per item plus text at 12 characters a
  second) and it is pure reading time. Real booth time — settling, re-takes, a breath
  between lines — is realistically **5 to 8 hours**, so three to five sittings.
- **"Next week" is not unrealistic.** If Aran wants something in Steve's hands sooner,
  the first 40 contributions are 334 lines, about 1h15m of reading (call it 2½–3 hours in
  the booth) and they cover the opening of the session end to end. That is a
  recommendation, not a decision — the whole queue is built and waiting either way.

## Where it is

- Pod `cym_n_for_eng:senedd-s4c-steve`, **visibility `held`** from the first INSERT —
  never created live and closed afterwards.
- It also carries **`required_role = previewer_001`**, the per-learner gate that landed on
  `main` minutes before this pod did. So two independent structural locks, not a setting
  someone could flip. Steve's own grant in `learner_roles` is **not** run — see below.
- Aran reaches it at his existing link, `/r/human_aran_cym_n`. No new page, no new
  recording UI, no new endpoint.

## What was decided, and what it cost

**The English reaches Aran through a per-sentence ask.** Every line carries
`rerecord_wanted.known` naming him — the same flag `pods-plan.cjs` already reads for
exactly this purpose. Two alternatives were weighed and dropped: casting Aran as
`__explainer__` on `cym_n_for_eng` would have swept *every* pod's English in that course
into his list (and he already is the explainer, which is why that route changes nothing
here); leaving the English to the per-course studio would have meant Aran logging in to a
long-take surface he does not use.

That needed a small change in the shared queue module, because the one recordist surface
was target-only by construction. The change is opt-in per sentence: a pod that does not
ask sees no difference. Measured against the live estate before and after:

| | before | after |
|---|---|---|
| Aran's queue | 769 | 1157 (+377 Senedd English, +11 pod-0 English) |
| Catrin's queue | 466 | 481 (+15 pod-0 English) |
| uncast lines | 239 | 239 |

**The cost elsewhere is those 26 lines.** They are known-side re-record wants somebody
already wrote against `cym_n_for_eng:pod-0`, several with reasons like "no speech in the
take". They were real work, previously reachable only from the login-gated per-course
studio; they now show on the one recordist surface. Nothing else in the estate moved.

Every English line arrives in the booth carrying, in its crib line:

> ENGLISH — read this line aloud in English. Deliberate: this pod's English exists
> nowhere else, so it is recorded, not synthesised. Welsh: …

## The splitting

The longest contribution was **508 words**. The longest stored line is **90**; the mean is
21. Splitting is hierarchical and never crosses the pairing: paragraph first, then
sentence, and where the translator merged or split a sentence, a small length-ratio
alignment over 1:1 / 1:2 / 2:1 groupings only. Where that does not come out clearly good,
the unit stays whole — a long-but-correct line beats a short-but-mispaired one every time.

**8 contributions needed that fallback.** Nothing was translated, tidied, corrected or
normalised; splitting is the only editing operation performed on the record's words.

Sentences longer than about 45 words were left whole rather than cut at a semicolon: a
half-sentence is a worse listening unit than a long one, and Aran can breathe mid-line.
31 such lines exist.

## The gap you need to know about

**51 of the session's contributions were spoken in English and have NO Welsh in the
record at all** — not in the bilingual export and not in the Welsh-only export either.
They are not in the pod. Nothing was translated to fill them, per the standing rule.

That means the pod is the Welsh side of the session: 109 of the 160 spoken contributions.
The English-only ones are Carolyn Thomas, Tom Giffard, Hefin David and some of Chris
Jones's answers, listed by contribution id in the pod's own metadata. Steve will hear a
coherent session — the chair, Rhodri Williams, Alun Davies and Llyr Gruffydd carry it —
but it is not the complete floor.

(A further 31 rows in the XML for this item carry no text at all: placeholder rows, not
contributions.)

## Decisions for Tom or Kai

1. **The 51 English-only contributions.** Leave the pod as the Welsh side of the session
   (my recommendation — it is honest, it is what the record contains, and nobody has to
   write Welsh that was never spoken), or have somebody translate them so the session is
   complete. One word: **leave** or **translate**.
2. **Steve's access.** `required_role = previewer_001` is on the pod, but no grant is
   written, because two learner rows match "Steve" and neither is obviously him. Somebody
   who knows which account is Steve's does one INSERT into `learner_roles`. Not mine to
   guess.
3. **The 26 pod-0 English wants now visible to Aran and Catrin.** My recommendation:
   **leave** them — they are genuine wants, and the whole point of one recordist surface
   is that it shows all of somebody's outstanding work.

## What was NOT done

No TTS, no audio generation, no audio-pass queueing — Welsh is human-voice and the audio
for this pod is Aran's mouth. No new page and no new recording UI. No booth full-width
work and no line-editing work: those are somebody else's items. The casting gates that
require male/female alternation were **not** weakened; this pod is a deliberate,
Tom-ruled single-voice exception and says so in its own metadata.
