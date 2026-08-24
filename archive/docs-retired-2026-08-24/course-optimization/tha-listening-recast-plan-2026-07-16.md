# Thai listening-pod recast plan (`tha_for_eng:pod-0`)

> **STATUS: EXECUTED & VERIFIED 2026-07-16.** Neighbour cast FEMALE; voices reused
> (3F/2M). Applied: 3 text fixes (turns 1/28/128), 47 speaker renames, cast
> rebuilt (23→31 speakers), 57 target-audio regenerated via `/generate-pods`
> (0 failed), take-g re-rendered. Verified: **122/122 linked full-sentence audios
> match speaker gender; 0 mismatches; cast audit ✓ 0 conflicts.**
>
> **UPDATE 2026-07-16 (later):** English/known side ALSO fixed — 38 known audios
> regenerated for flipped characters (varied English cast preserved). Final verify:
> **Thai 121/121 + English 121/121 linked audio match speaker gender.**
> Systemic hardening done via PROMPT guidance (Kai's steer — not code checks):
> `pod-generation-prompt.txt` STEP 1 gained a SPEAKER GENDER clause, and the
> ledger prompt (`pod-dialogue-generator.cjs` buildPodGlossary) gained section 6
> pinning `<speaker> = male|female`. Language-agnostic.
>
> **Casting loop CLOSED:** `pod-recolour.cjs` now resolves speaker gender from the
> gendered speech in each speaker's OWN lines (shared `tools/gendered-speech.cjs`,
> also used by the lint) — marker → text → name. Verified: Neighbour/Waiter/
> Pharmacist (name-inferred MALE, wrong) now read FEMALE from their lines. So the
> voice picker self-corrects even without markers. ⚠️ Still don't `--apply`
> recolour on tha — its eng known pool is one voice ("Tom") and would flatten the
> varied English cast (separate coverage-config gap).
>
> **Remaining (optional):** orphans — Kai chose to LEAVE the 681 unreferenced rows;
> pod_explainer/fine-known for the 3 text-changed atoms slightly stale; fix the
> English known-voice pool so recolour doesn't flatten English; extend
> `gendered-speech.cjs` patterns to jpn/hin/Slavic/Romance; verify live in app.
>
> Applied via `scripts/tha-recast.cjs` + `scripts/tha-atom-null.cjs` (gitignored).
> Backup of pre-change sentences+cast: `temp/tha-recast-backup/`.

---


**Trigger:** Learner report (via Kai's brother) — the male speaker in the Thai
listening exercises uses female politeness markers ("lady boy" / kathoey speech).

**Confirmed:** In the listening dialogue, several characters are voiced by a
voice whose gender doesn't match the Thai politeness particles baked into their
lines (male `ครับ` vs female `ค่ะ/คะ`). The pod generator is correct — the fault
is the cast (`listening_pods.speakers`) plus a few gender-inconsistent lines.

Detected by `tools/audio-gender-lint.cjs tha_for_eng`.

---

## Root structure of the problem

1. **Generic role names reused across scenes for different-gender characters.**
   One cast name → one voice, but e.g. "Customer 1" is a **female** cafe/bar
   customer in scenes 7–8 and a **male** diner in scene 9. `ara` (female voice)
   is applied to all of them → the male restaurant lines get a female voice, and
   elsewhere the reverse.
2. **A few lines have the wrong-gender particle for their own speaker**
   (translation slips) — so even after correct casting, those specific lines
   still mismatch and need a text fix.

## Current voices (inferred gender — VERIFY against cast registry)

| voice_id | gender | currently used for |
|----------|--------|--------------------|
| `ara` | **F** | Anna, Receptionist, + blindly on Customer/Passenger/Customer 1 |
| `4ff93971bfdc` | **F** | Sarah, Narrator |
| `eve` | **F** | Assistant, Customer 2 |
| `908c4626660f` | **M** | James, Guest, Local, Driver, Bartender + miscast Waiter/Pharmacist/Barista/Neighbour/Friend |
| `rex` | **M** | Tourist, Customer 3 |

We have 3 female + 2 male voices to distribute. (Older generations used more
ids — `sal`, `leo`, `0463086e`, etc. — those are **stale**, not in the live cast.)

---

## Corrected cast, scene by scene

`✎` = needs a target-text particle fix. `⟳` = speaker rename needed in
`listening_pod_sentences.speaker` (to break a collapsed generic name).

### Scene 1 — Sarah & neighbour, morning (turns 1–4)
- **Neighbour** → decide ONE gender. Lines split M(1)/F(3). **Proposed: FEMALE**
  → `✎` turn 1 `สวัสดีครับ`→`สวัสดีค่ะ`. Voice `ara`/`eve`.
- Sarah → F (`4ff93971bfdc`), unchanged.

### Scene 2 — bus seat (5–6)
- **Passenger** here = **MALE** (turn 6). This is a *different* person from the
  taxi passenger in scene 14 → `⟳` rename to **"Bus passenger"**, voice `908c…`/`rex`.

### Scene 3 — cafe, 3 pm (7–9)
- **Barista (3 pm)** = **FEMALE**. Currently voice `908c…` (male). Voice → `eve`/`ara`.

### Scene 4 — evening friend (10–12)
- **Friend** here = **FEMALE**. `⟳` rename → **"Evening friend"** (distinct from the
  practice Friend in scene 15). Voice `ara`/`eve`.

### Scene 5 — neighbour, night (13–14)
- Same neighbour as scene 1 → FEMALE, consistent. Keep name "Neighbour".

### Scene 6 — James & Anna (15–26) ✓ already consistent
- James = M (`908c…`/`rex`), Anna = F (`ara`). No change.

### Scene 7 — cafe (28–41)
- **Barista** = **FEMALE**; `✎` turn 28 `...ครับ`→`...ค่ะ` (only male line). Voice female.
- **Customer 1** = F, **Customer 2** = F, **Customer 3** (turn 40) = M.
  → `⟳` these are cafe customers; keep female voices for 1&2, male for 3.

### Scene 8 — bar (43–57)
- **Bartender** = M ✓. **Customer 1/2/3** here = **FEMALE** (all `ค่ะ`).
  Same generic names as scene 7 — genders happen to align (F) except scene 7
  Customer 3 (M). → `⟳` disambiguate Customer 3 between cafe(M) and bar(F).

### Scene 9 — restaurant (59–75)
- **Waiter** = **FEMALE** (waitress, all `ค่ะ`). Currently male `908c…`. Voice → female.
- **Customer 1 & 2** here = **MALE** diners. → `⟳` rename to **"Diner 1"/"Diner 2"**,
  male voices. (Critical: these currently get female `ara`/`eve`.)

### Scene 10 — shop/pharmacy (77–85)
- **Customer** here = **FEMALE**; **Assistant** = F. → `⟳` rename Customer → **"Shopper"**, female voice.

### Scene 11 — hotel (87–98) ✓
- Guest = M, Receptionist = F. No change.

### Scene 12 — pharmacy (100–108)
- **Customer** here = **MALE**; **Pharmacist** = **FEMALE** (currently male `908c…`).
  → `⟳` rename Customer → **"Patient"**, male voice; Pharmacist → female voice.

### Scene 13 — directions (110–119) ✓
- Tourist = M, Local = M. No change.

### Scene 14 — taxi (121–129)
- **Passenger** = **MALE**; `✎` turn 128 `...คะ`→`...ครับ` (stray female line). Driver = M ✓.
  → `⟳` distinct from scene-2 bus passenger.

### Scene 15 — learner & practice friend (131–142)
- Learner = neutral (turn 135 F). Practice **Friend** = neutral. Keep as-is
  (no particles → no mismatch), but `⟳` distinct name from scene-4 evening friend.

---

## Work items

1. **Text fixes** (`listening_pod_sentences.target_text`) — ~4 lines:
   turns **1, 28, 128** (+ re-scan after for any missed stray particles).
2. **Speaker renames** (`listening_pod_sentences.speaker`) — break the collapsed
   generic names: Bus/Taxi passenger, Evening/Practice friend, cafe vs restaurant
   customers (Diner 1/2), Shopper vs Patient, cafe vs bar Customer 3.
3. **Recast** (`listening_pods.speakers`) — rebuild the map with corrected
   gender + voice per (now-disambiguated) speaker.
4. **Regenerate** the take-g pod audio for every turn whose voice changed
   (`node tools/render-take-g.cjs tha_for_eng` for the affected `global_order`s)
   — **TTS cost, requires Kai's explicit approval before running.**
5. **Re-verify**: `node tools/audio-gender-lint.cjs tha_for_eng` → expect 0 cast
   findings and 0 audio mismatches.

## Regen scope (estimate)
Turns whose voice changes: all of Waiter (7), Pharmacist (4), both restaurant
Diners (~9), cafe/bar Baristas (~9), Neighbour (3), evening Friend (2), shop/
pharmacy customers (~10), + text-fixed turns. ≈ **50–60 turns**, each rendered as
several punctuation-cued groups → on the order of **150–200 short Azure clips**.
Azure TTS on this volume is a few dollars, but still gated.

## Open decisions for Kai
- **Neighbour gender** (scene 1/5): proposed FEMALE (fix turn 1). OK, or make male
  (fix turn 3 instead)?
- **Voice distribution**: reuse the 3 F / 2 M voices, or add distinct cast voices
  for the new split roles (Diner 1/2, Shopper, Patient) for more variety?
- Confirm the 5 voice-id → gender inferences above against the real cast registry.
