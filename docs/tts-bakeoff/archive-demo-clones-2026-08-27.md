# Two demo voices from the archive — and one thing to confirm before this goes to Aran

**2026-08-27.** Two instant clones, built from existing SSi recordings. No new recording was made and nobody was asked for anything.

**These are DEMO clones, for Aran and Catrin to hear and approve.** Nothing goes to production in either voice until each of them has okayed their own clone. That is not a formality — it is somebody's voice, and it is theirs to say yes or no to.

---

## Read this before you send it on

**I have labelled these by where the audio came from, not by whose voice it is,** because the attribution is inference rather than record.

Here is exactly what is known. Two SSi docs state that **Aran voices North's English and Catrin voices South's English** (`docs/pods/welsh-recording-pack-SUPERSEDED-2026-07/README.md:80`, corroborated by `docs/pods/pod0-english-shared-cast-2026-08-11.md`). The database does **not** confirm it: the large presentation voice is a bare `human` voice_id with no row in `voices` and no link in `dashboard_users`. Catrin *is* directly linked in the database, but only to her Welsh target-language rows — not to this English presentation audio.

So the mapping below is a documented inference, and it is good evidence. It is not proof, and sending Aran a clone that turns out to be Catrin is not a mistake worth risking for the sake of a label. **You will know in three seconds which is which. Confirm it, and I will rename both clones and the doc.**

---

## Voice 1 — from `cym_n_for_eng` presentation *(documented as Aran)*

**The real recording it was cloned from**, 28.8 seconds of existing archive audio:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/clone-sources/aran-source.mp3

**The clone, saying things it has never said:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/north-long.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/north-teach.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/north-question.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/north-short.mp3

---

## Voice 2 — from `cym_s_for_eng` presentation *(documented as Catrin)*

**The real recording it was cloned from**, 15.0 seconds:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/clone-sources/catrin-source.mp3

**The clone:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/south-long.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/south-teach.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/south-question.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/demo-voices/south-short.mp3

---

## What the archive turned out to hold

The census went looking for whether a Pro Voice Clone dataset — 30 minutes minimum — could be assembled from recordings that already exist. The answer is yes for two of the three people, and no for the one you might have expected.

| Voice | Clean English in the archive | Clears the 30-min PVC floor? |
|---|---|---|
| `cym_n` presentation *(documented Aran)* | **~115 minutes** | Yes, comfortably — nearly 4× over |
| `cym_s` presentation *(documented Catrin)* | **~118 minutes** | Yes, comfortably |
| **Tom** | **0 minutes found** | **No** |

**There is no archived English recording of you.** The census searched the audio tables, the voices registry, the user records and this machine's filesystem. The only `tom`-named human voice is tied to `zzz_test_for_eng` fixture courses and was correctly treated as not yours. So **a Tom PVC still needs a recording session** — the archive shortcut works for Aran and Catrin, and not for you.

**One honest gap in that search**: it covered watson-1 and the `mastered/` S3 prefix only. If original studio session files live on your laptop or another bucket, they were not searched and could change this answer entirely. Worth a moment's thought before you book a studio.

---

## How to spend the two PVC slots — my recommendation

You have two Pro Voice Clone slots on Startup. Three candidate voices, and the one with the live product need has no dataset. My recommendation:

**Spend one slot now on the `cym_n` voice, and hold the second for your own recording.**

The reasoning is that it buys the answer to the open question *weeks* earlier and costs nothing at all. The instant-versus-Pro wander comparison — does a Pro clone, which learns pacing from the dataset rather than guessing it from six seconds, actually cure the take-to-take wander? — does not care whose voice it runs on. Aran's archive dataset is already recorded, already clean, already 115 minutes. Running the A/B on that voice answers the mechanism question without anybody booking a studio, and if the answer is "Pro fixes it", you record knowing it is worth the half hour rather than hoping.

Holding the second slot means your own PVC is not competing for space when your recording exists.

**What I would not do**: spend both slots on archive voices now. It uses up the scarce thing to clone two people who have not yet approved a demo, in service of no immediate product need.

**One thing I have not established**: whether a PVC slot can be freed by deleting a clone, which would make all of this much less consequential. Worth knowing before the second slot is committed.

---

## What is needed from you

1. **Which voice is which** — three seconds of listening, then I rename both clones and this page.
2. **Then**, if you are happy, this page is what goes to Aran, with the demo-and-approval line at the top intact.
3. **The slot recommendation** above, when you have a view. Nothing is spent on a PVC until you say.

Cost so far: eight demo clips and two instant clones, a few hundred credits out of 1.25 million. Nothing at volume, and no PVC training started.
