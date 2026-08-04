# Deborah fixes — eus_for_eng / spa_for_eng / afr_for_eng (flagged 2026-07-30)

Verified against live DB 2026-07-31. Attestation ("first-seed") checks run over the full
course corpus. **Live paid courses** — text edits null the affected audio via DB trigger;
audio is refilled on the next approved phase-8 pass (Kai's click, from `main`).

Legend: ✅ APPLIED · 🔊 AUDIO-ONLY (Kai TTS, no text change) · 🅳 STAGED for Deborah (needs her call)

---

## ✅ APPLIED (text fixes + re-decomposed + audio-pass queued)

### afr_for_eng
- **S0008L01U05** "i'm going to try to explain how to speak Afrikaans"
  target `ek gaan probeer om Afrikaans te verduidelik` → **`ek gaan probeer verduidelik hoe om Afrikaans te praat`**.
  Old text dropped *praat* and "how to speak", meaning only "…try to explain Afrikaans".
  New form mirrors attested siblings U01 (`…verduidelik hoe om Afrikaans te praat`) + B03 (`ek probeer verduidelik`).
  *(welshspringbok reported this as "seed 20/21"; it is actually S0008. Afrikaans has no in-loop native reviewer — worth a confirm.)*

### spa_for_eng  (English-side only unless noted)
- **S0505L02** lego `I don't get` → **`I don't stay`** (+ component `get`→`stay`, + B01). Spanish `no me quede` unchanged (already "stay").
- **S0524L01** removed **"back"** from the English throughout (`I'll call you back` → `I'll call you`, lego + component + B01–B04 + U01–U05). Spanish `te llamaré` already lacked "back".
- **S0531L01** lego + B01 `whoever` → **`anyone`** (basket teaches "anyone"; `cualquiera` unchanged, usage is the correct `cualquiera puede + INF`).
- **S0531L02** lego `the game` target `juego` → **`el juego`** *(target-side → audio)*.
- **S0529L01** debut fragment `¿podéis` → **`podéis`** (strip lone leading `¿`; debut fragments carry no `?` per methodology) *(target-side → audio)*. Full questions in the basket keep `¿…?`.
- **S0529L02U04** `put your hands up please` `levantar las manos, por favor` — **DELETED**. Infinitive-as-command is wrong; the correct `levanta/levantad … por favor` imperatives aren't introduced yet.

### eus_for_eng
- **S0037L02** `carefully` `kontu handiz` (M: kontu+handiz = *extremely* carefully) → **`kontuz`** (plain "carefully"), lego demoted M→A, components cleared, B01 fixed. The other 8 phrases in the basket already said `kontuz`; downstream `kontuz` phrases (23) re-tiled to the new A-lego *(target-side → audio)*.

---

## 🔊 AUDIO-ONLY — no text change, needs a TTS regen (Kai's click)

| Round | Item | What's wrong | Action |
|---|---|---|---|
| eus S0006 R19 | S0006L03 "I'm trying to remember" | Text is correct (`gogoratzen saiatzen ari naiz`) but the **LEGO voice says** `gogoratu nahian ari naiz` — a stale/mis-rendered clip. | Regenerate the LEGO presentation + target audio. |
| eus S0007 R20 | S0007L01 `gaur` "today" | Pronunciation too fast; final **-r** dropped → sounds like "gaup". | Regen with a slower/clearer render (candidate: SSML pause or phoneme hint on `gaur`). |
| spa S0522 R1103 | S0522L02 `fue estúpido` | Text is correct masculine `estúpido`; the **F voice says `estúpida`**. Both voices + INTRO/LEGO should say `estúpido`. | Regen the F-voice (target2) clip. |
| spa S0531 R1123 | S0531L01 `cualquiera` | **M voice chops the end** of the word. | Regen the M-voice (target1) clip. |
| spa S0523 R1105 | S0523L01 `instead of` | Deborah hears **"instead of, um"** on the prompt. DB known text is clean (`instead of`) → this is in the **presentation text/audio**, not the phrase row. | Investigate `lego_introductions` / presentation clip for S0523L01; regen. |

---

## 🅳 STAGED for Deborah — Basque reworks (composition needed; NOT auto-applied)

Each verified against attestation. Where Deborah's suggested wording uses an unintroduced form, that's flagged — the fix is correct Basque but conflicts with the teaching order, so it needs her call (reword to an attested form, or introduce the form earlier).

### S0021 R62 — `her` = `haren`  ⚠️ complication
Deborah: switch to `bere` (more common, used in R63) **or** keep `haren` + mix his/her in the Builds.
**Finding:** S0020 **already** teaches `his/her` = `bere` (gender-neutral, used throughout S0020). So switching S0021L02 wholesale to `bere` would make it a **duplicate lego** re-teaching `bere`. Also the phrase Deborah cited, `Badakizu haren izena?`, is **not in the current basket** (current: `haren izena jakin nahi duzu?` etc.) — she may have reviewed an earlier state.
**Options for Deborah:** (a) keep `haren` as the distinct non-reflexive form + relabel some Builds to "his" (English-side only); (b) if `bere` is wanted, S0021L02 should be **repurposed to a new lego** (not re-teach `bere`). Kai leaned (b)-`bere`; surfacing the duplication before acting.

### S0028 R84 — `starting` = `hastea` + `nahi` is unnatural
Builds are `hitz egiten hastea nahi dut` — nominalised `hastea` + `nahi` doesn't work; natural is `…hasi nahi dut`, but **`hasi` isn't introduced until S37**. `hastea` IS correct as a subject/object (S0028L03 already: `hitz egiten hastea erabilgarria da`).
**Attestation:** `gustatzen` (like) debuts **S26** → Deborah's frame `verb-en hastea gustatzen zait` ("I like starting to verb") is available.
**Proposed:** reframe the S0028L02 Builds around `hastea gustatzen zait` / `…erabilgarria da` (evaluative frames) instead of `nahi`. Candidate Builds: `hitz egiten hastea gustatzen zait`, `euskaraz hitz egiten hastea gustatzen zait`, `ikasten hastea gustatzen zait`. Deborah to confirm wording.

### S0033 R95 — Builds smuggle unintroduced `daramazu` / `noiz arte`
Lego `how long` = `zenbat denbora` (fine), but Builds use `daramazu` ("you've been"), `daramat`, and `noiz arte` ("until when") — **none introduced/glossed** (all first appear here, untaught). This is structural: the "have-been-Xing-for" construction (`daramazu/daramat`) is used across **S33–S38** but never taught as a lego/component.
**Needs a call:** either introduce a lego/component for `daramazu/daramat` (and `noiz arte`) ≤S33, or simplify these baskets to `zenbat denbora + [introduced forms]`. Spans multiple seeds — recommend Deborah/Kai decide the teaching approach before I rework.

### S0038 R108 — `week` = `aste` → `astebete`; Builds need `daramat`
Deborah: lego should be `astebete` (a *whole* week / passage of a week); she adapted the Builds to use `daramat`. Depends on the S0033 `daramat` decision above. Lego swap `aste`→`astebete` is clean; the Builds inherit the `daramat` question.

### S0039 R111 — Build 5 "after a week" needs `astebeteren buruan` (unavailable)
**Attestation:** `astebeteren` **never appears**; `buruan` not until **S131**. So `astebeteren buruan` cannot be used at S39.
**Proposed:** reword/replace Build 5 with an attested "after a week" rendering (the course uses `aste bat ondoren` — see S0039L02U02 `aste bat ondoren nekatuta nago`). Candidate: `astebete ondoren…` using introduced forms. Deborah to confirm.

### S0040 R112 + R113 — `you are` lego wrong; rebuild around `zer moduz?`
- **R112:** S0040L01 `you are` = `zara` — but the whole basket uses `zaude` (`hemen zaude?`, `nekatuta zaude?`, `prest zaude?`…). Deborah: lego should be **`zaude`** not `zara`. Clean swap (lego + B01), **but** interlinked with R113 below, so staged together.
- **R113:** S0040L02 `you feel` = `sentitzen zara` — Builds are mostly `zer moduz?` variants, not `sentitzen zara`. Deborah proposes replacing the lego with **`zer moduz?`** and this basket:
  1 `zer moduz?` · 2 `zer moduz zaude gaur?` · 3 `prest zaude?` · 4 `zer moduz zaude une honetan?` · 5 `zer moduz zaude gaur goizean?` · 6 `nekatuta zaude?` · 7 DELETE (`zer iruditzen zaizu euskaraz hitz egitea?` — off-topic).
  `moduz` currently appears only once (S0040L01U02) — making it a lego here is coherent. Needs `une honetan` attestation-check before applying.

### S0041 R115 / R116 / R117 — "feeling" reworks
- **R115** S0041L02 `feeling` = `sentitzen`: Basque doesn't use "feeling" this way. Deborah: use `ongi nago` / `ondo nago` ("I'm well"), and Build 2 → the question `ongi nago?` / `ondo nago?`. (`ongi` debuts S41, `ondo` S13, `nago` S10 — all available.)
- **R116** Build 3 `bihar nekatzen arituko naiz` — **`arituko` never appears** (unintroduced future-continuous); Build 6 "after a week" → same `astebeteren buruan` unavailable issue as R111.
- **R117** S0041L04 `beginning` = `hasten` — Deborah prefers `hasi` in most Builds (basket already uses `hasi naiz`). Lego English/target mismatch → rework, not a clean swap.

### S0043 R118 — `nengoen` misused as general "I was"  ⚠️ forward-ref
`nengoen` is only the past of `nago` (I was *in a state/place*); wrong for action phrases. Deborah's per-Build fixes use `pentsatzen ari nintzen`, `saiatzen ari nintzen`, `jakiten hasten ari nintzen`.
**Attestation:** the **past-continuous `ari nintzen` doesn't debut until S0143**, and **`jakiten` never appears** (attested form is `jakin`, S17). So Deborah's exact wording forward-refs by ~100 seeds.
**Keep-`nengoen` (correct, state/place):** B01 `nengoen`, B02 `hemen nengoen`, U01 `prest nengoen`, U02 `nekatuta nengoen` (4 → meets floor).
**The action phrases** (B03 `pentsatzen nengoen`, U03 `saiatzen nengoen`, U04 `jakin hasten nengoen`, U05 `erantzuna pentsatzen nengoen`) need a past form — but `ari nintzen` isn't taught yet. **Needs a call:** introduce `ari nintzen` earlier, use a different attested past, or delete/rehome these phrases.

---

## Spanish deepening (Deborah's general note + Kai)

Deborah: too many Builds just append "here / before / yesterday" to the new words
(`let's agree that here`, `giving an excuse before`, `whenever you feel here`, …).
Confirmed pervasive (S0522 B03/B04, S0523, S0524, S0529, S0542, and many more) — output of a
build-template that rotates adverbs. Fix = replace the filler with genuinely varied,
attested phrases **in-place on the flagged seeds**, using the existing deepening flow
(`tools/backfill-spread/` + `docs/course-optimization/lego-spread-backfill-playbook.md`)
extended to same-basket variety. Rules (from `spa-deepening-pass-2026-07-27`): Peninsular
register (tú/vosotros), **never force** a phrase, form-attested ≤ host seed, a 2nd
register-aware Opus reviewer greps each verb/prep for the course's LOCKED rendering (ZUT drift),
**list deletions for Kai** (paid live). To run as a scoped follow-on.

Specific nonsense to delete in that pass (Deborah-flagged): S0542L01 B03/B04/U03/U04
(`whenever you feel here/before`), S0522L01 B03/B04 (`let's agree that here/before`).
