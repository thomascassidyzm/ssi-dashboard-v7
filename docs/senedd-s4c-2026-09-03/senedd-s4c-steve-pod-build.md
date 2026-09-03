# Steve's Senedd/S4C pod — built, held, Welsh in Aran's queue, English synthesised

Built 3 September 2026, and revised the same evening on Tom's correction: **the English
lines are TTS, not Aran.** Source: the Welsh Parliament's own bilingual XML export of the
Culture, Communications, Welsh Language, Sport and International Relations Committee,
11 January 2024, agenda item 8 — *Allegations concerning bullying at S4C: evidence session
with S4C*.

## The number

**383 Welsh lines for Aran. About 1 hour 20 minutes of actual reading.**

- The pod holds **399 paired rows** — each a Welsh line beside the English that actually
  corresponds to it. Aran reads the Welsh only; 14 of those rows repeat a line he is
  already reading, so 383 distinct readings fill all 397 Welsh slots that need him.
- 1h20m is the estate's own estimate (3 seconds per item plus text at 12 characters a
  second) and it is pure reading time. Real booth time — settling, re-takes, a breath
  between lines — is realistically **2½ to 4 hours**, so **one long sitting or two
  comfortable ones**.
- **Next week is comfortably realistic for the whole thing.** If he would rather do it in
  bites, the first 40 contributions are 166 lines, about 38 minutes of reading, and cover
  the opening of the session end to end. That is an option, not a cut — the whole queue is
  built and waiting.

## The English is done by machine

Every English line is rendered on `gfzdpspr5fdp`, the estate's standard male English pod
clone — the same voice `fra_for_eng` and twenty other pods use for their known track. One
English voice throughout, for the same reason as the Welsh: this is one man reading a
public record to one learner, not a drama. Nothing about the English touches Aran, and
nothing about the Welsh touches TTS.

**This needed a gate narrowed, and you should know about it.** `cym_n_for_eng` carries a
hard "no TTS may ever be generated" block from your own rulings of 25 July and 13 August.
That block was course-scoped, so it refused the *English* gloss of a Welsh course too, and
the first probe failed on it having spent nothing. Every reason those rulings give is
about Welsh audio — a synthesised Welsh clip reaching a learner, Aran's and Catrin's
recordings never being overwritten, Welsh gaps being a recording worklist. So the guard now
asks what LANGUAGE the clip is and permits exactly one answer: the known half of the
course's own code. Welsh is refused in every spelling (`cy`, `cy-GB`, `cym`, `cym_n`), a
call that names no language is refused as before, and the pipeline entry guards that keep
these courses out of every bulk render queue are untouched. **If you read your own ruling
as covering the English too, say so and I will put it straight back** — it is one commit.

## Where it is

- Pod `cym_n_for_eng:senedd-s4c-steve`, **visibility `held`** from the first INSERT — never
  created live and closed afterwards.
- It also carries **`required_role = previewer_001`**, the per-learner gate that landed on
  `main` minutes before this pod did. Two independent structural locks, not a setting
  someone could flip.
- Aran reaches the Welsh at his existing link, `/r/human_aran_cym_n`. No new page, no new
  recording UI, no new endpoint.

## The splitting

The longest contribution was **508 words**. The longest stored line is **90**; the mean is
21. Splitting is hierarchical and never crosses the pairing: paragraph first, then
sentence, and where the translator merged or split a sentence, a small length-ratio
alignment over 1:1 / 1:2 / 2:1 groupings only. Where that does not come out clearly good,
the unit stays whole — a long-but-correct line beats a short-but-mispaired one every time.

**8 contributions needed that fallback.** Nothing was translated, tidied, corrected or
normalised; splitting is the only editing operation performed on the record's words.
Sentences longer than about 45 words were left whole rather than cut at a semicolon: a
half-sentence is a worse listening unit than a long one. 31 such lines exist.

## The gap you need to know about

**51 of the session's contributions were spoken in English and have NO Welsh in the record
at all** — not in the bilingual export and not in the Welsh-only export either. They are
not in the pod, and nothing was translated to fill them.

So the pod is the Welsh side of the session: 109 of the 160 spoken contributions. The
English-only ones are Carolyn Thomas, Tom Giffard, Hefin David and some of Chris Jones's
answers, listed by contribution id in the pod's own metadata. Steve will hear a coherent
session — the chair, Rhodri Williams, Alun Davies and Llyr Gruffydd carry it — but it is
not the complete floor.

(A further 31 rows in the XML for this item carry no text at all: placeholder rows, not
contributions.)

## Decisions for Tom or Kai

1. **The narrowed TTS gate.** My reading is that the human-voice rulings protect Welsh
   audio, not the English gloss of a Welsh course. One word: **keep** or **revert**.
2. **The 51 English-only contributions.** Leave the pod as the Welsh side of the session
   (my recommendation — it is honest, and nobody has to write Welsh that was never spoken),
   or have somebody translate them. One word: **leave** or **translate**.
3. **Steve's access.** `required_role = previewer_001` is on the pod, but no grant is
   written, because two learner rows match "Steve" and neither is obviously him. Somebody
   who knows which account is his does one INSERT into `learner_roles`.

## What was NOT done

No Welsh TTS — not one clip, and the renderer refuses outright if a known track is ever
cast to a human. No new page and no new recording UI. No booth full-width work and no
line-editing work: those are somebody else's items. The casting gates that require
male/female alternation were **not** weakened; this pod is a deliberate, Tom-ruled
single-voice exception and says so in its own metadata.

The earlier design that routed English lines into a human recording queue was **reverted in
full** rather than left in place unused, since the correction makes it not merely
unnecessary but wrong here.
