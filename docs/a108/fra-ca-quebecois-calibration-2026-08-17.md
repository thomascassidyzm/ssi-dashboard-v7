# fra_ca_for_eng — the 286 are real, and the voices were never the problem

**Commissioned by Kai, 2026-08-17:** *"the Azure voices should be able to speak Québécois, so go and see, and fix."*

**Headline: the 286 survive calibration — 286/286 at row level, 10/10 at byte level. But the premise underneath the job does not. The course's target voices are already Azure fr-CA (Sylvie and Antoine), and 382 seeds of Québécois text have already been rendered through them. This is not a voice problem. It is a re-render pass that stopped at seed 305 and never came back.**

---

## 1. Calibration — is the 286 real, or is it another jpn?

The jpn_for_eng finding of 155 was entirely artefact: a trailing full stop in a stale `text_normalized` column. That is the calibration bar this number had to clear.

**It clears it.** Re-derived live with the runbook's Step 0 comparator — *both* disjuncts, so the 41,900-row backfill artefact cannot leak in:

| role | links | stale | clean |
|---|---|---|---|
| known | 666 | **0** | 666 |
| target1 | 668 | **286** | 382 |
| target2 | 668 | **286** | 382 |
| **total** | **2,002** | **572** | **1,430** |

286 seeds, 572 links. An exact reproduction of the pilot's figure, independently derived. The known (English) side is 100% clean.

### 1a. The comparator is calibrated in both directions

A comparator that flags everything is as useless as one that flags nothing, so both verdicts were checked by hand.

**Rows it calls STALE really are stale** — 25 inspected, 25 uniform. The seed text is Québécois and the clip text is the pre-conversion metropolitan wording:

| seed | seed text (Québécois) | clip text (metropolitan) |
|---|---|---|
| 1 | J'veux parler **québécois** avec toi **là** | Je veux parler **français** avec toi **maintenant** |
| 5 | **M'as** pratiquer à parler avec quelqu'un d'autre | **Je vais m'entraîner** à parler avec quelqu'un d'autre |
| 10 | **Chu pas sûr si j'peux** me rappeler toute la phrase | **Je ne suis pas sûr de pouvoir** me souvenir de toute la phrase |
| 14 | Tu parles**-tu** québécois toute la journée? | tu parles **français** toute la journée ? |
| 16 | **Y** veut revenir avec tout le monde **tantôt** | **il** veut revenir **plus tard** avec tout le monde |
| 17 | **A** veut savoir **c'est quoi la réponse** | **elle** veut découvrir **quelle est la réponse** |
| 18 | **On veut se voir** à six heures **à soir** | **nous voulons nous rencontrer** à six heures **ce soir** |
| 64 | Apprendre le **québécois** c'est pas facile mais c'est **le fun** | apprendre le **français** n'est pas facile mais c'est **amusant** |

**Rows it calls CLEAN really are clean** — 12 sampled at random, 12 exact matches. `Chu pas convaincu que ça serait une ben bonne idée`, `J'ai de la misère à croire que tu peux pas deviner`, `Ça a été ben plaisant…` — clip text identical to seed text, almost all stamped 2026-07-29.

### 1b. The bytes, not the row

The pilot left this open as its own Gap 1: every finding compared seed text against `course_audio.text`, which is *metadata about* a clip, not the clip. A row that says the right thing is exactly what has lied to everybody before.

**18 real clips were downloaded from the live learner endpoint and transcribed with whisper.** The bytes agree with the rows, unanimously:

| | clips | whisper says | verdict |
|---|---|---|---|
| flagged STALE | 10 | the **metropolitan** wording, every time | **10/10 confirmed defect** |
| flagged CLEAN (2026-07-29) | 8 | the **Québécois** wording, every time | **8/8 confirmed healthy** |

Worked examples:

- seed 64 target1 — text says `Apprendre le québécois c'est pas facile mais c'est le fun`; the clip **speaks** *"Apprendre le français n'est pas facile mais c'est amusant."*
- seed 18 target1 — text says `On veut se voir à six heures à soir`; the clip **speaks** *"Nous voulons nous rencontrer à six heures ce soir."*
- seed 526 target1 (clean) — text says `J'ai de la misère à croire que tu peux pas deviner`; the clip **speaks** exactly that.
- seed 550 target1 (clean) — `Le boutte du village`; the clip speaks it (whisper renders the spelling as *"le bout"*, which is ASR orthographic normalisation, not a different word).

Reading whisper here needs one caution, stated so it is not mistaken for a result: **whisper normalises joual spelling toward standard French orthography** — it writes *"Je restais"* for `J'restais`, *"Ils sont"* for `Y sont`, *"il y a"* for `y'a`. So whisper cannot adjudicate accent or register. What it *can* do, and did, is adjudicate **lexical content**, and that is where the defect lives: *français* vs *québécois*, *amusant* vs *le fun*, *me souvenir* vs *me rappeler*, *nous voulons nous rencontrer* vs *on veut se voir*. Those are different words and whisper heard the wrong ones in all ten stale clips.

**Calibrated true count: 286 seeds / 572 links. Nothing rejected. This is a genuine class-(b) defect and it is learner-audible.**

---

## 2. The premise the job was built on is wrong — and it is good news

The brief asked: *can the four voices on this course actually produce Québécois?* The question was reasonable when the pilot wrote it and it has an answer already sitting in the database.

**`courses.voice_config` for `fra_ca_for_eng`, live:**

| role | voice | locale | provider | speed |
|---|---|---|---|---|
| known | Tom `gfzdpspr5fdp` | en-GB | xai | 1.0 |
| **target1** | **Sylvie — `fr-CA-SylvieNeural`** | **fr-CA** | **azure** | 0.85 |
| **target2** | **Antoine — `fr-CA-AntoineNeural`** | **fr-CA** | **azure** | 0.85 |
| presentation | Sonia `en-GB-SoniaNeural` | en-GB | azure | 0.95 |

`voice_pool_key` is `fra_ca`, not `fra`. The target voices are Québécois Azure neural voices and have been since the config was created 2026-04-15.

And it is not just configuration — **the clips carry it too.** Every one of the 2,002 seed target links, stale and clean alike, is voiced by `azure_fr-CA-SylvieNeural` or `azure_fr-CA-AntoineNeural`:

| role | voice_id | stale | clean |
|---|---|---|---|
| target1 | `azure_fr-CA-SylvieNeural` | 256 | 382 |
| target1 | `fr-CA-SylvieNeural` *(bare — tagging variant of the same voice)* | 30 | 0 |
| target2 | `azure_fr-CA-AntoineNeural` | 256 | 382 |
| target2 | `fr-CA-AntoineNeural` *(bare)* | 30 | 0 |

The 30 bare-prefixed rows are a known estate tagging artefact, not a different voice.

**So the stale clips are not "standard French audio". They are Québécois voices speaking metropolitan French *words*.** The accent was always right; the script was stale. That is a narrower and cheaper defect than the one the job was scoped around, and it removes the voice-capability question entirely — **382 seeds of real Québécois are already rendered through Sylvie and Antoine and can be listened to today at zero cost.**

---

## 3. What actually happened: a re-render that stopped at seed 305

The stale rows are not scattered. They are a block:

| seed range | stale seeds |
|---|---|
| 1–100 | 98 |
| 101–200 | 97 |
| 201–300 | 90 |
| 301–668 | **1** (seed 305) |

The clean clips are stamped **2026-07-29**; the stale ones **2026-04-16 → 04-28**. A re-render pass after the Québécois conversion covered seeds ~306–668 and 19 stragglers below that, then stopped.

**The 286 undone seeds are the first 305 of the course** — the opening half, the part every single learner hits first and the part a beta reader judges the course on. A learner starting `fra_ca_for_eng` today reads `J'veux parler québécois avec toi là` on screen and hears *"Je veux parler français avec toi maintenant."* From seed ~306 onwards it silently starts working.

---

## 4. Second finding, larger than the first: the presentation layer still says "The French for:"

Presentations mirror the LEGO, so they were checked. They carry a different and bigger defect.

**All 3,057 presentation clips in this Québécois course begin with the words "The French for:". Not one says "Québécois".**

| voice | clips | say "The French for:" | say "Québécois" | rendered |
|---|---|---|---|---|
| `xai_gfzdpspr5fdp` (Tom) | 1,671 | 1,671 | **0** | 2026-07-29 |
| `azure_en-GB-SoniaNeural` (Sonia) | 1,386 | 1,386 | **0** | 2026-04-16 → 04-28 |
| **total** | **3,057** | **3,057** | **0** | |

Two things fall out of that table and they are separate:

1. **The narration text was never converted.** This is a *text* defect on the English known side, not stale audio — the clips faithfully speak the text they were given. It is out of scope for an audio-only pass and **I have not touched it**, but a course that teaches `québécois` while its narrator calls the language "French" throughout is a coherence problem Kai should rule on, and it is 3,057 clips wide.
2. **The presentation narrator changed voice mid-course.** `voice_config` says presentation is Sonia (en-GB Azure, female). The 2026-07-29 pass rendered 1,671 presentation clips as Tom (xai clone, male) instead. A learner hears a woman narrating the early course and a man narrating the later course. **The render path did not honour `voice_config.voices.presentation`** — which is a pipeline finding, not a content one, and it is the same pass that left the 286 seeds behind.

---

## 5. What this does to the plan

- The **voice ruling** the brief put in front of the render ruling can be taken **for free**, on 382 seeds of already-rendered Québécois, before a cent is spent.
- The **paid sample** is therefore worth spending on the question the free evidence *cannot* answer: whether an alternative fr-CA voice beats the incumbent, and whether the render path produces a good clip today.
- The **presentation voice inconsistency** must be understood before any bulk render, or the completion pass will inherit whatever made the 07-29 pass ignore `voice_config`.

---

*Calibration run 2026-08-17. Read-only throughout: no content written, no links changed, no audio rendered, no money spent.*
