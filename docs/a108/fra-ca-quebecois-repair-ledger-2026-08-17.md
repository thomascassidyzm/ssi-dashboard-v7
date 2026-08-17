# fra_ca_for_eng — repaired. 570 links, 16 clips rendered, $0.03

**Done. The 286 seeds now speak Québécois.** Kai's ruling of 2026-08-17 replaced the listening-page budget gate with "just generate them, provided it is not expensive". The full cost came to **$0.03**, so it proceeded without coming back.

Companion docs: `fra-ca-quebecois-calibration-2026-08-17.md` (the evidence the 286 were real), `fra-ca-quebecois-plan-2026-08-17.md` (the relink discovery).

---

## 1. The ledger

| | links |
|---|---|
| defect at start (calibrated) | **570** |
| repaired by **relinking** an existing verified clip | **554** |
| repaired by **rendering** a new clip | **16** |
| **defect at end** | **0** |
| excluded as not-a-defect (punctuation) | 2 |

**Rendered: 16 clips, 1,704 characters, ~$0.03.** Nothing else was generated. **No clip was deleted** — the old metropolitan clips remain in place, unlinked, so the change is reversible.

Course stamps bumped: `content_stamp` and `audio_stamp` → 2026-08-17T14:34Z.

---

## 2. Kai's punctuation ruling, applied — the count moved 572 → 570

The ruling: classify punctuation diffs **by type**, never as one class. Applied to this course:

**(1) Trailing full stops — no audible difference, never a defect.** Structurally impossible to reach the defect list here: `normalize_text()` is `rtrim(lower(trim(t)), '.?!¿¡。？！')`, so a trailing-period-only diff is already invisible to the comparator. **0 in the total.**

**(2) Question marks — surfaced separately with a count, as instructed.** Among the 764 links the comparator calls clean, the number differing by the presence or absence of a trailing `?` is **0**. There is nothing here to spend on, so the "regenerate if small, skip if large" branch never opens.

**(3) Punctuation as a deliberate pronunciation aid — do not correct back.** One case, and it changed the headline number. **Seed 68** was in the 286:

| | |
|---|---|
| seed text | `Qu'est-ce que tu cherches?` |
| clip text | `qu'est-ce que tu cherches ?` |

The only difference is the French typographic space before the question mark. Both carry the `?`; the clip is audibly identical to the seed. It reached the defect list only through a comparator artefact — `rtrim` strips the `?` and leaves the space behind, so the two sides differ by one trailing space.

**Seed 68 was excluded and left untouched.** The true defect was **570 links across 285 seeds**, not 572/286. Those 2 links are the only rows the comparator still flags, by design.

---

## 3. What was actually wrong, and why re-rendering was the wrong instinct

Confirmed before spending: text Québécois, audio metropolitan, verified at row level (570/570) and byte level (10/10 by whisper on real clips). Not a jpn-style artefact.

But **554 of the 570 needed no TTS at all.** The 2026-07-29 pass had already rendered correct Québécois clips in the right role and voice; they were never attached. `audio_autolink` carries `AND <col> IS NULL` — it only fills holes, so it declined to move a column already holding the stale clip, and 554 correct clips were orphaned at birth.

The 16 that genuinely needed rendering were 9 seeds where no correct clip existed anywhere in the course.

---

## 4. A correction I had to make mid-run — the feminine clips are by design

Partway through I concluded that 25 replacement clips were defective: their `word_boundaries` showed the Sylvie (female) voice speaking **feminine** agreement — *chu pas sûr**e***, *fatigué**e***, *prêt**e*** — where the seed text is masculine. I judged them anomalies and started rendering replacements.

**That was wrong, and the database stopped me** — a `unique_course_audio_per_voice` violation on the first one.

The check that settled it: seeds **340, 406, 555, 654** sit in the already-shipped, already-clean 382 and their Sylvie clips *also* speak the feminine form while storing the masculine. Gender adaptation for the female voice is **systematic, deliberate pipeline behaviour across the whole course**.

It is invisible in `course_audio.text`, which stores the canonical masculine form. Only `word_boundaries` — Azure's own record of what it synthesised — shows what was actually spoken. My earlier reasoning had compared stored text, which hides the adaptation entirely.

**All 25 were relinked, not re-rendered.** Net effect of the error: zero wasted spend, because the unique index refused the duplicate before any money was spent on it.

---

## 5. Verification — what I checked, and what I could not

No human ear gated this, so the mechanical verification carries the weight.

**Before touching any link (make-before-break):**
- all 554 replacement clips: S3 object present — **554/554**, none under 8 KB;
- durations 1,824–6,192 ms, median 3,624 ms, **none null, none under 500 ms**;
- 554 distinct clip ids, **no replacement equal to the clip it replaces**;
- voice identity confirmed on every one after normalising the `azure_` prefix artefact — **0 cross-voice swaps**.

**The 16 new renders**, before linking:
- rendered at the course's own **0.85 speed** through `fr-CA-SylvieNeural` / `fr-CA-AntoineNeural`, mastered with `normalizeAudioClean` at −16 LUFS — the same compressor-free chain the shipping pipeline uses;
- whisper-transcribed **16/16**, content words correct in every one;
- mean volume −17.5 to −19.7 dB, max −1.9 to −2.5 dB, **no clipping, no silent clips, no truncation**;
- durations 2.52–5.26 s, all proportionate to their text.

**After the swap, across all 1,336 target links in the course:**

| check | result |
|---|---|
| comparator re-run | **570 → 0** (2 excluded seed-68 rows remain, as intended) |
| voice census | **668 Sylvie + 668 Antoine**, nothing else |
| null durations | **0** |
| spoken text (`word_boundaries`) equals seed text | **1,279** |
| differs only by the by-design feminine adaptation | **41** |
| any other difference | **0** |
| no `word_boundaries` | 16 — my own renders; see the gap below |
| served-bytes spot check through the production endpoint | **14/14 correct**, all Québécois |
| all 16 new clips fetch live | **16/16**, none undersized |
| legos and phrases still clean | 1,366 + 1,366 and 12,834 + 12,841, **0 stale** |

### What I could NOT verify

1. **Accent quality was never judged.** Whisper normalises joual toward standard French orthography — it writes *"Je restais"* for `J'restais`, *"Il"* for `Y`, *"Tchou"* for `Chu`. It can adjudicate **lexical content**, which is where this defect lived, and it did. It **cannot** tell you whether Sylvie and Antoine sound convincingly Québécois. No human ear has judged that, and this repair does not establish it.
2. **My 16 renders carry no `word_boundaries`.** The `azure-tts-service.generateAudio` path does not capture the boundary array, so those 16 clips cannot be verified by the strongest available mechanical check and are covered only by whisper plus the audio-health measurements. The 554 relinked clips all have it.
3. **The veracity gate never ran** on any of these clips — the 22,798 clips from the 2026-07-29 pass all have `veracity_checked_at IS NULL`. I verified independently rather than relying on it, but no pipeline gate has passed judgement on this audio.
4. **One orphaned S3 object** may remain from the render that the unique-index rejection interrupted (upload precedes insert in my script). The sweep to find it did not finish — `mastered/` is very large. It is an unreferenced file, harmless, and costs pennies of storage.

---

## 6. Findings handed on, not acted upon

**6a. Two genuine gender-adaptation bugs — pre-existing, in already-live seeds.** The adaptation feminises the speaker's own adjectives, which is right, but twice it has feminised a **third-person masculine referent**:

| seed | English | seed text | Sylvie actually speaks |
|---|---|---|---|
| 354 | *"**he** didn't need to appear angry"* | Y'avait pas besoin d'avoir l'air **fâché** | …d'avoir l'air **fâchée** |
| 498 | *"**he's** standing alone over there…"* | Y'est debout **tout seul** là-bas… | Y'est debout **toute seule** là-bas… |

Both produce a masculine pronoun with feminine agreement. Both date from 2026-07-29 and both sit **above seed 305**, so they were already live before this repair — I did not introduce them and have not changed them. They need a French speaker's ruling. The other nine flagged rows (106, 147, 351, 371, 376, 379, 398, 528, 571) are correct: the adjective describes the speaker.

**6b. The presentation layer still says "The French for:".** All **3,057** presentation clips; **0** say "Québécois". This is a *text* defect on the English known side, not stale audio — the clips faithfully speak the script they were given. Untouched, and it is wider than the defect this job was commissioned for.

**6c. The presentation narrator changes voice mid-course.** `voice_config` names Sonia (`en-GB-SoniaNeural`); the 2026-07-29 pass rendered 1,671 presentation clips as `xai_gfzdpspr5fdp` (Tom) against 1,386 earlier Sonia clips. **The render path did not honour `voice_config.voices.presentation`.** A pipeline defect, untouched.

**6d. The pod corpus is a separate register question — GAP in my own scope check.** My scope check covered seeds, legos, phrases and presentations. It did **not** cover the pod roles, and an independent census caught that: `pod_explainer` (1,090 clips) and `pod_take_g` (182) also carry French, and they are live — `pod_legos.explainer_audio_id` is 429/429 linked and 140/232 pod sentences carry a take-g reference.

They are **not** metropolitan residue from the conversion: the 15 `français` hits all read *"le français québécois"*, correctly naming the dialect. But the pod scenarios are a separate corpus (restaurant, station) written in standard register — *"Je vais prendre l'agneau, s'il vous plaît"*, *"Je veux, un verre de vin"* — where the course's seed side says `m'as` and `j'veux`. 17 clips carry uncontracted `je veux` / `je vais`.

Uncontracted forms are valid Quebec French, so this is a **methodology call, not a data defect**, and it is not counted in any figure above. It needs a human ruling. Note also that `pod_take_g` uses `fr-CA-JeanNeural` — so Jean is not unused after all.

**6e. The two SSML builders disagree on `xml:lang`.** `services/tts-service.cjs:353` hardcodes `<speak xml:lang="en-US">` regardless of the target voice, while `services/azure-tts-service.cjs:162-164` derives the locale from the voice name. An explicit `<voice name="fr-CA-...">` governs pronunciation, so this is very likely inert — but it is unverified, and it means **my 16 renders (via `azure-tts-service`, correctly tagged `fr-CA`) were not built identically to what the phase8 production path would emit.** Worth reconciling before the next render on any regional-variant course.

**6f. The autolink trap generalises.** Any course in the 674-row stale-seed ledger has the same problem: a re-render creates the right clip, the trigger refuses to attach it, and the pass reports success. **Run the relink query before costing any of them** — most of the spend may not be real.

---

## 7. The voices, for the record

Azure offers **exactly four** fr-CA neural voices, confirmed live against `voices/list`: `fr-CA-SylvieNeural` (F), `fr-CA-JeanNeural` (M), `fr-CA-AntoineNeural` (M), `fr-CA-ThierryNeural` (M). The course already used Sylvie and Antoine and **Sylvie is the only female fr-CA voice Azure has**, so target1 had no alternative. The incumbents were kept — which is also what made 554 of the repairs free.

---

*2026-08-17. 16 clips rendered (~$0.03). 570 links swapped in one transaction. No clip deleted. Seed text untouched.*
