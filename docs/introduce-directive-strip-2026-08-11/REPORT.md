# The "introduce false" directive is out of the Italian course — and a bigger one is still live

**11 August 2026.** Fixed the three courses you approved. Found a fourth that is worse, and left it alone because you didn't approve it.

---

## The headline

**The Italian course is fixed and it is live for learners now.** I confirmed it by downloading the actual audio a learner's app downloads and listening to it through transcription — not by reading the database.

What a Japanese learner of Italian used to hear, in the Italian voice:

> "che non conosco, **introduce, false**"
> "non sono pronto, **introduce, false**"
> "no, **introduce, false**"

What they hear now:

> "che non conosco"
> "non sono pronto"
> "no"

I checked all 72 clips that serve those 42 phrases. 72 out of 72 come back clean. None say "introduce". None say "false". None are missing.

---

## The numbers

| Course | Rows fixed | Audio existed | Clips replaced |
|---|---|---|---|
| Italian for Japanese speakers (beta, public) | 42 | yes, all voiced | 72 |
| Hakka for English speakers (draft, hidden) | 3,974 | none | none needed |
| Swiss German for English speakers (draft, hidden) | 128 | none | none needed |
| **Total** | **4,144** | | **72** |

4,144 is exactly the number in your brief. I re-derived it from the live database before touching anything.

**Your point about the directive never working is correct, and I checked it.** On all 4,144 rows the introduce flag was already set to true. The text was trying to switch it off and never did. Removing the text loses nothing.

Before and after, a sample from each course:

| Course | Prompt the learner sees | Before | Now |
|---|---|---|---|
| Italian | あなたを | `ti (introduce: false)` | `ti` |
| Italian | 同意 | `d'accordo (introduce: false)` | `d'accordo` |
| Hakka | every | `逐 (introduce:false)` | `逐` |
| Hakka | question | `問題 (introduce:false)` | `問題` |
| Swiss German | not | `nöd (introduce:false)` | `nöd` |
| Swiss German | you need to | `muesch (introduce:false)` | `muesch` |

Only the directive came out. Nothing else in the text was touched.

---

## What the 72 clips cost

**Under one penny.** 41 clips actually needed rendering — 327 characters of text in total. The other 31 needed no rendering at all: the course already owned a clean recording of the same word in the same voice, so they were simply re-pointed at it for free.

That is why the clip count is 72 and not 42: each phrase has two Italian voices, and 42 phrases share 36 distinct words between them.

---

## Did I verify by listening?

Yes, on both sides, and through the route a learner's app really uses.

- **Before:** I downloaded 12 of the old clips and transcribed them. Every one of them speaks the directive out loud. That is the proof the defect was real and audible, not just untidy text.
- **After:** I downloaded all 72 clips now serving those phrases and transcribed them. All clean.

I also bumped the audio revision on every replaced clip and gave each one a brand-new identity, which is what actually forces a learner who already has the old audio cached to fetch the new one. A fix without that is invisible, and this estate has been bitten by it before.

---

## Seeds unapproved: none, and I checked rather than assumed

I looked up the approval state of all 529 seeds behind the 4,144 rows I edited. **Not one of them was approved.** So the rule applies to zero seeds here, not because I skipped it.

For contrast, the course I did *not* touch — English for Marathi speakers — has 36 approved seeds carrying the same defect. If you green-light that one, those 36 will need unapproving.

---

## Presentation clips

The rule was applied. In Italian the presentation clips speak the *Japanese* side ("について、…、をイタリア語で言うと：") and never contained the directive. I transcribed them along with everything else and they are clean, so nothing needed changing there.

---

## ⚠️ The thing you should decide on next

**English for Marathi speakers has the same defect, on 102 clips, and it is not a beta — it is released, public and live.**

It uses a slightly different spelling of the directive (`[introduce:false]` instead of `(introduce: false)`), which is why it was missed by the original search. It is:

- 54 phrases, 102 voiced clips
- every one of those 102 clips reachable by a learner right now
- 36 of its seeds are approved

Learners are hearing lines like **"down introduce false"**, **"to make introduce false"**, **"to wait introduce false"** — in English, in a released course.

I have not touched it. It was outside what you approved and the brief was explicit. It is the same fix and roughly the same trivial cost. **Say the word and I'll do it.**

---

## Everything else I found

I swept every course for the directive and for other build instructions left in learner text.

- **Mexican Spanish** — 217 clips still store the directive, but nothing points at them any more, so no learner can hear them. Someone cleaned the text previously and left the clips stranded. That course does have 156 phrases with no first-voice audio and 137 with no second-voice audio, which is a separate silent-slot backlog worth looking at.
- **North Welsh (1 clip) and Chinese (2 clips)** — false alarms. The word "introduce" is legitimate English content there ("It's time to introduce you to…"). Nothing wrong.
- **Other bracketed leftovers in learner text**, all counts, none fixed: 133 `[classifier]` / `[question]` notes in Hakka, 14 in Min Nan, 3 in Swiss German and a handful elsewhere — 157 in all, almost all on the English prompt side of hidden draft courses. Plus 4 stragglers: `a good thing [is_new=false]` in Marathi, `[then]` in Gujarati, and two `[5]` markers in Hindi. And three annotations: `to (directive)` and `to ask for (directive)` in Basque, `(phrase)` in Bulgarian.
- **A second artefact in the same rows I fixed**: 118 of the 128 Swiss German phrases and 11 of the 42 Italian ones have their text wrapped in stray double quote marks (`"stavi"`). I left them, because you told me to strip only the directive. Good news: the quotes are **not** spoken — I verified that in the transcripts. It is untidy text, not a learner-audible fault. Worth a separate pass.

---

## One thing that happened along the way, so you know

Editing the text automatically knocked the audio links off, by design — the database re-points a phrase at a clean recording if it already owns one, and blanks it if it doesn't. That is what created the 31-free / 41-render split. It also, in exactly one case, re-pointed the Italian word "altro" at an old clip in a retired voice. I spotted it in a voice audit and put it back on the correct Italian voice. All 84 voice slots across the 42 phrases are now on the same two Italian voices they started on.

---

## How to reverse it

Every row and every clip was photographed before it changed, and the photographs are committed. Nothing was deleted — not one clip, not one audio file. All 72 old Italian recordings still exist, still with their original audio, and can be re-pointed back one at a time.

To undo: the record holds, for every one of the 4,144 rows, its exact original text; and for every replaced clip, the old identity, the old file, the old length and the new ones beside them. Reversing is putting the old text back and pointing the phrases at the old clips. Ask and I'll do it.

---

## Status

- Italian: **fixed, verified by listening, live for learners.**
- Hakka and Swiss German: **fixed.** Both are hidden drafts, so no learner was affected either way, and no audio existed to regenerate.
- English for Marathi: **not fixed. Live. Waiting on you.**
