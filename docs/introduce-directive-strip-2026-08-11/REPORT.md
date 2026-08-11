# The "introduce false" directive is out of the Italian course — with one correction to the brief, and a live one still open in Marathi

**11 August 2026.** Fixed all three courses you approved, in both places the defect lives. Found a fourth course that is worse and left it alone because you didn't approve it.

---

## An important correction first

The brief said learners **hear** "introduce false" read aloud in the Italian course. Half of that is right and the half that is wrong matters, so here it is plainly.

**The audio really does say it.** I downloaded the actual clips and transcribed them. They come back as:

> "che non conosco, **introduce, false**"
> "non sono pronto, **introduce, false**"
> "Più di, **introduce, false**"

**But the learning app never asks for those clips.** All 42 Italian rows are "component" rows — the pieces a word breaks into. Every place the app fetches phrases filters those rows out. I checked all three fetch points in the app's code and none of them will load a component row. So the audio was a loaded gun, not a fired one.

**What learners could actually see is worse than a footnote, and the brief didn't cover it.** The same directive was sitting in a *second* place — the decomposition tiles printed on the LEGO card, which the app does serve and does display. In Italian that was **42 tiles across 34 cards**. A learner opening one of those cards saw

> あなたを → `ti (introduce: false)`
> いいえ → `no (introduce: false)`

on screen. That was missed by the original search because it was buried inside a structured field rather than a plain text column.

**I have fixed both places.** The report below covers both.

---

## The numbers

| Course | Phrase rows | Card tiles | Audio | Clips replaced |
|---|---|---|---|---|
| Italian for Japanese speakers (beta, public) | 42 | 42 on 34 cards | all voiced | 72 |
| Hakka for English speakers (draft, hidden) | 3,974 | 4,017 on 1,720 cards | none | none needed |
| Swiss German for English speakers (draft, hidden) | 128 | 150 on 69 cards | none | none needed |
| **Total** | **4,144** | **4,209** | | **72** |

4,144 phrase rows is exactly the number in your brief — I re-derived it from the live database before touching anything, and it matched. The 4,209 tiles are the surface the brief didn't know about.

**Your point about the directive never working is correct, and I checked it before relying on it.** On all 4,144 rows the introduce flag was already true. The text was trying to switch it off and never did. Removing it loses nothing.

Before and after, a sample from each course:

| Course | Prompt | Before | Now |
|---|---|---|---|
| Italian | あなたを | `ti (introduce: false)` | `ti` |
| Italian | 同意 | `d'accordo (introduce: false)` | `d'accordo` |
| Hakka | every | `逐 (introduce:false)` | `逐` |
| Hakka | question | `問題 (introduce:false)` | `問題` |
| Swiss German | not | `nöd (introduce:false)` | `nöd` |
| Swiss German | you need to | `muesch (introduce:false)` | `muesch` |

Only the directive came out. Nothing else in the text was touched.

---

## What the clips cost

**Under one penny.** 41 clips actually needed rendering — 327 characters of text in total. The other 31 needed no rendering at all: the course already owned a clean recording of exactly the same word in exactly the same voice, so they were simply re-pointed at it, free.

The clip count is 72 rather than 42 because each phrase has two Italian voices, and the 42 phrases share 36 distinct words between them.

---

## Did I verify by listening?

Yes for the audio, through the route a learner's app really uses, on both sides:

- **Before** — I downloaded 12 of the old clips and transcribed them. Every one speaks the directive out loud. That is the proof the clips were genuinely bad, not just untidy text.
- **After** — I downloaded **all 72** clips now serving those phrases and transcribed them. All 72 come back as the clean Italian word. None says "introduce". None says "false". None is missing or broken.

Three of the 41 renders were initially refused by the automatic quality gate for "last word missing" — "più di" and "come se". I didn't override that blind: I transcribed the *old* clips of the same words first, where the words are demonstrably present, and the gate mangled those too. The gate is unreliable on very short clips; the new recordings are correct. I checked them individually and installed them with that noted on the record.

I also gave every replaced clip a brand-new identity and advanced its revision number, which is what actually forces a learner who already has the old audio cached to fetch the new one. A fix without that is invisible, and this estate has been caught by it before.

**One honest gap:** for the *card tiles* I could only verify through the deployed app as far as the free preview reaches, which is the first 55 items and shows clean. The affected cards sit further into the course, behind a paid learner login I don't have. For those I verified the stored data directly — a full re-scan of all three courses now returns zero — and read the serving code, which passes the tiles straight through untouched. I could not put a paying learner's eyes on them and I'm not going to claim otherwise.

---

## Seeds unapproved: none, and I checked rather than assumed

I looked up the approval state of all 529 seeds behind the rows I edited. **Not one was approved.** The rule applies to zero seeds here — not because I skipped it.

For contrast, the course I did *not* touch has 36 approved seeds carrying the same defect. If you green-light that one, those 36 will need unapproving.

---

## Presentation clips

Rule applied. In Italian the presentation clips speak the *Japanese* side ("について、…、をイタリア語で言うと：") and never contained the directive. I transcribed them alongside everything else and they are clean, so nothing needed changing.

---

## ⚠️ The thing to decide next

**English for Marathi speakers has the same defect and it is not a beta — it is released, public and live.**

It spells the directive slightly differently (`[introduce:false]` rather than `(introduce: false)`), which is exactly why the original search missed it. It has:

- 54 phrases and **102 voiced clips**, every one of them still wired up
- **54 tiles across 53 LEGO cards** — the surface learners genuinely see
- 36 approved seeds

Learners are seeing lines like **"down [introduce:false]"**, **"to make [introduce:false]"**, **"to wait [introduce:false]"** — in English, in a released course.

I have not touched it. It was outside what you approved. It is the same fix, roughly the same trivial cost, about half an hour. **Say the word and I'll do it.**

---

## Everything else the sweep turned up

- **Mexican Spanish** — 217 clips still store the directive, but nothing points at them, so nothing can play them. Someone cleaned that text earlier and left the recordings stranded. Its cards are clean. Separately it has 156 phrases with no first-voice audio and 137 with no second — a silent-slot backlog worth a look.
- **North Welsh (1 clip) and Chinese (2 clips)** — false alarms. "Introduce" is legitimate English content there ("It's time to introduce you to…").
- **Other bracketed leftovers in learner text**, counted, none fixed: 157 in all — 133 `[classifier]` / `[question]` notes in Hakka, 14 in Min Nan, 3 in Swiss German, a handful elsewhere, almost all on the English prompt side of hidden drafts. Plus four stragglers — `a good thing [is_new=false]` in Marathi, `[then]` in Gujarati, two `[5]` markers in Hindi — and three annotations: `to (directive)` and `to ask for (directive)` in Basque, `(phrase)` in Bulgarian.
- **A second artefact in the rows I fixed**: 118 of the 128 Swiss German phrases and 11 of the 42 Italian ones have their text wrapped in stray double quote marks, like `"stavi"`. I left them, because you said strip only the directive. The good news is the quotes are **not** spoken — I confirmed that in the transcripts. Untidy text, not an audible fault. Worth its own small pass.

---

## One thing that happened along the way

Changing the text automatically knocked the audio links off — by design. The database re-points a phrase at a clean recording if it already owns one, and blanks it if it doesn't. That is what produced the 31-free / 41-render split. It also, in exactly one case, re-pointed the Italian word "altro" at an old recording in a retired voice. I caught it in a voice audit and put it back. All 84 voice slots across the 42 phrases are now on the same two Italian voices they started on.

---

## How to reverse it

Every row, every tile and every clip was photographed before it changed, and the photographs are committed. **Nothing was deleted** — not one recording, not one audio file. All 72 old Italian recordings still exist with their original audio and can be pointed back one at a time.

The record holds, for each of the 4,144 rows and 1,823 cards, its exact original content; and for each replaced clip, the old identity, old file and old length beside the new. Reversing is putting the old content back and re-pointing at the old clips. Ask and I'll do it.

---

## Status

- **Italian: fixed in both places, and the fix is live for learners.** The card tiles no longer show the directive, and the audio that spoke it is no longer attached to anything.
- **Hakka and Swiss German: fixed.** Both are hidden drafts, so no learner was affected either way, and no audio existed to regenerate.
- **English for Marathi: not fixed. Live. Waiting on you.**
