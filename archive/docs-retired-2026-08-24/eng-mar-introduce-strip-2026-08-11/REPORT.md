# The build directive is out of English for Marathi speakers — live, verified by listening

**11 August 2026.** Fixed. The counts in your brief were right, I re-derived every one of them before touching anything, and they matched exactly. Nothing was deleted.

---

## What a learner saw and heard before

**On screen**, opening a LEGO card, the decomposition tiles read:

> वेळ → `time [introduce:false]`
> बनवणे → `to make [introduce:false]`
> अपेक्षा → `expectation [introduce:false]`

**Out loud**, I downloaded the actual clips a learner's app fetches and transcribed them. They really speak it:

> "to share. **Introduce.**"
> "Enough. **Introduce...**"
> "the **introduced fault.**"
> "What it's like, **introduce clothes.**"

That is a released, public, live course, in English, telling learners to "introduce false".

## What a learner sees and hears now

> वेळ → `time`
> बनवणे → `to make`
> अपेक्षा → `expectation`

and the audio says "to share", "enough", "the", "what it's like". Nothing else in any of the text was touched — only the directive and the space it left behind.

---

## What I changed

| Surface | Count |
|---|---|
| LEGO card tiles — **what learners can see** | **54 tiles on 53 cards** |
| Phrase rows | **53** (a 54th was already clean) |
| Audio clips replaced | **48** |
| Approved seeds unapproved | **36** |

Both surfaces, as you insisted. The tiles are the one that mattered: I confirmed in the app's own serving code that it reads the tiles off the card and hands them to the player untouched, and that it never serves the phrase rows at all.

**Your point that the directive never did anything holds here too, and I checked rather than assumed.** On all 54 rows the introduce flag was already switched on. The text was trying to turn it off and never did. Removing it loses nothing.

---

## What it cost

**Well under a penny — 390 characters of speech, about half a US cent.**

Changing the text automatically knocks the audio off, by design. Of the 102 clips involved, **58 were free**: the course already owned a clean recording of exactly that word on exactly that voice, so they were simply re-pointed at it. The remaining **48 needed rendering** — 390 characters in total, on the same two English voices the course already used.

Every one rendered clean. One needed a second take; none needed the quality gate overridden.

---

## Did I verify by listening? Yes.

I downloaded **all 204 clips** now serving these cards from the live learner route — the same address a learner's app uses — and transcribed the actual bytes.

- **0** say "introduce"
- **0** say "false"
- **0** are unreachable
- **0** are silent or empty
- **0** slots were left without audio

Every replaced clip got a brand-new identity and its revision number advanced, which is what actually forces a learner who already has the old audio cached to fetch the new one. I confirmed both address forms serve the new bytes. A fix without that step is invisible, and this estate has been caught by it before.

I also re-swept **all 144 courses** afterwards: **zero card tiles and zero phrase rows anywhere on the estate still carry the directive.**

---

## One honest gap

**I could not put a learner's eyes on the fixed cards through the app.** The free preview of this course stops at seed 19; the affected cards are at seeds 544 to 598, behind a paid login I don't have. I verified them three other ways and I'm not going to claim more than that:

1. the stored tiles now read clean, on all 53 cards;
2. I read the serving code and confirmed it copies the tiles through without altering them;
3. I fetched the live preview from the deployed app and confirmed it really does render tiles from that same field for the cards it does reach.

The audio verification has no such gap — that was done on the real bytes, through the real route.

---

## Seeds unapproved: 36

Every seed behind content I changed was approved, and I unapproved all 36 so the proofreader sees them again: **544, 547, 552, 553, 555, 557, 558, 559, 563, 566, 568–573, 576, 577, 579–582, 584, 585, 587–598.**

The course now stands at 614 approved seeds of 668.

## Presentations

Rule applied, nothing needed changing. The presentation clips here speak the **Marathi** side ("इंग्रजी — 'वेळ' — …"), never the English word, so none of them ever contained the directive. I transcribed them all alongside everything else and they are clean and untouched.

---

## Two things I noticed and did not fix

- **Other courses:** the directive is gone from every visible surface estate-wide. What remains is stranded recordings that nothing points at and nothing can play — **217 in Mexican Spanish** (pre-existing, someone cleaned the text earlier and left the audio behind), **72 in Italian** and **102 in Marathi** (these last two are the old clips from this fix and the one an hour ago, deliberately kept for reversibility). No learner can reach any of them.
- **A separate artefact in this same course:** **47 other cards have 104 tiles wrapped in stray double quote marks**, like `"मला"` → `"I"`. It is visible in the live preview. It is not the directive, so I left it alone. Worth its own small pass — say the word.

---

## How to reverse it

Every row, every tile and every clip was photographed before it changed, and the photographs are committed. **Nothing was deleted** — not one recording, not one audio file. All 102 original clips still exist with their original audio and can be pointed back one at a time. The record holds, for each row and card, its exact original content, and for each replaced clip, the old identity, old file and old length beside the new. The 36 seed approvals are recorded with their original timestamps and can be restored exactly. Reversing is putting the old content back and re-pointing at the old clips — ask and I'll do it.

---

## Status

**Fixed in both places, and the fix is live for learners.** The card tiles no longer show the directive, and the audio that spoke it is no longer attached to anything a learner can reach.
