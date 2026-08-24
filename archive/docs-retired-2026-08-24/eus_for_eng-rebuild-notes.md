# eus_for_eng — Rebuild Notes

**Status:** All 668 seeds flagged for rebuild (2026-04-24).
**Course:** Basque for English Speakers. Target: Basque (Ainhoa F, Ander M — eu-ES). Known: English (Sonia F).
**Context:** Course built using earlier systems. Deborah content-check (2026-04-22 and 2026-04-24) on S0002–S0006 surfaced systemic grammar issues that affect not just those seeds but patterns across the course.

## Scope of the rebuild

- **Reviewed by Deborah:** S0002 through S0006 — detailed grammar fixes below, keep as a reference/spec.
- **Not reviewed but flagged:** S0001 and S0007–S0668 — rebuild with the grammar rules below as priors. A regex scan identifies 56 seeds that hit at least one known pattern (listed at the bottom); start with those if prioritising.
- **Seed texts themselves need review too.** Several seed target_texts (e.g. S0005 "Beste norbaitek hitz egiten praktikatzera noa.") have the same issues listed below. Don't assume the seed target is canonical before checking.

## Systemic grammar patterns to enforce

These are the issues Deborah surfaced from S0002–S0006. Treat them as rules to apply during decomposition and phrase generation.

### 1. Future tense: no "noa"
**Wrong:** `X noa` ("going to X" via bare infinitive + "noa")
**Right:** `X-ko/-go dut` (future suffix + "dut")

- "noa" only means physical going-to-a-place (to be there). It is **not** a general future auxiliary.
- For future/"going to" meaning, attach `-ko` or `-go` to the verb stem, then the appropriate auxiliary:
  - `esan` (to say) → `esango dut` (I will say)
  - `hitz egin` (to speak) → `hitz egingo dut` (I will speak)
  - `praktikatu` (to practise) → `praktikatuko dut` (I will practise)

### 2. Case on "Basque" (the language)
**Wrong:** `euskaraz ikasi/ikasten` (instrumental + "to learn")
**Right:** `euskara ikasi/ikasten` (absolutive, because `ikasi` takes absolutive direct object)

- Use `euskaraz` (-z instrumental) only for "in/through Basque" as manner — e.g. `euskaraz hitz egin` (speak in Basque).
- Use `euskara` (bare absolutive) when Basque is a direct object — e.g. `euskara ikasi` (learn Basque).

### 3. Gerund vs perfect with `nahi` (want)
**Wrong:** `ikasten nahi` (gerund + want)
**Right:** `ikasi nahi` (perfect infinitive + want)

- `nahi` ("want") requires the **perfect** infinitive: `ikasi nahi dut` (I want to learn), `esan nahi dut` (I want to say).
- The `-ten` gerund form is for "-ing" / progressive constructions with `ari` or `saiatzen`, not with `nahi`.

### 4. "often": `maiz` / `askotan` vs `maizen`
**Wrong:** `maizen` used freely meaning "often"
**Right:** `maiz` or `askotan` for standalone "often"

- `maizen` (superlative) is only valid in the construction `ahalik eta maizen` ("as often as possible"). The `-en` superlative suffix is forced by the `ahalik eta` frame.
- Outside that frame, "often" is `maiz` or `askotan`.

### 5. "with someone else": case marking
**Wrong:** `beste norbaitek` (ergative-looking `-k`)
**Right:** `beste batekin` (sociative `-ekin`, "with one other")

- "with [person]" = sociative `-(r)ekin` suffix on absolutive: `batekin`, `nirekin`, `zurekin`.
- `beste batekin` = "with another one / with someone else".

### 6. Gerund with `saiatzen` (trying)
**Wrong:** `esan saiatzen ari naiz` (perfect + saiatzen)
**Right:** `esaten saiatzen ari naiz` (gerund + saiatzen)

- `saiatzen` takes the `-ten` gerund form of the action being attempted: `esaten` (saying), `egiten` (doing), `ikasten` (learning).
- The perfect (`esan`, `egin`) does not go with `saiatzen`.

### 7. `praktikatzera` → `praktikatu` (+ future if needed)
**Wrong:** `praktikatzera noa` / `praktikatzera` as the general form
**Right:** `praktikatu` (perfect/dictionary form) with future `-ko` attached when needed

- `praktikatzera` is the `-ra` allative ("to practise" as destination after movement verbs, which themselves don't fit future context here).
- For "I will practise": `praktikatuko dut`.
- For "practise speaking": `hitz egiten praktikatu`.

### 8. `zerbait bat` is invalid
**Wrong:** `zerbait bat` (something + one)
**Right:** `zerbait` alone

- `zerbait` already means "something"; adding `bat` ("one/a") is ungrammatical.

### 9. `gogoratu` (remember) — perfect vs gerund choice is context-dependent
- `gogoratu nahi dut` = "I want to remember" (perfect + nahi, per rule 3)
- `gogoratzen saiatzen ari naiz` = "I am trying to remember" (gerund with saiatzen, per rule 6)
- Don't mix: `gogoratu saiatzen` is wrong (perfect + saiatzen).

## Deborah's notes (verbatim, 2026-04-22 and 2026-04-24)

### 22/04
- **S0002, R6** — Build 1 & Cons 1: should be `euskara ikasi nahi dut` — "ikasten" can't go with "nahi"
- **S0002, R7** — Build 3 & Cons 2: should be `euskara ikasten saiatzen ari naiz`
- **S0003, R8** — "often" can be `maiz` or `askotan` but I haven't heard `maizen`. It's OK in "as often as possible" though, in R10 because it follows `ahalik eta` and words following that have to end in -en or -ena
- **S0004, R11** — Build 2: `euskaraz esaten saiatzen ari naiz`; Build 3: `maiz esan nahi dut`; Build 5: `orain esaten saiatzen ari naiz`; Build 7: `zurekin esaten saiatzen ari naiz`; Cons 1: `maiz esan nahi dut`
- **S0004, R12** — Build 5: "how to say it with you"; Build 6: `nola esaten ikasten saiatzen ari naiz`
- **S0004, R13** — Build 6: `zerbait esaten saiatzen ari naiz`
- **S0005, R14** — can't be `noa`. That's only for physical moving to somewhere. It needs to be the future suffix — Build 1: `esango`; Build 2: `hitz egingo`; Build 3: `zerbait esango dut`; Build 4: `orain esango dut`; Build 5: `maiz hitz egingo dut`; Build 6: `euskaraz hitz egingo dut`; Build 7: `zurekin hitz egingo dut`; Cons. 1: `zerbait esango dut`; Cons. 2: `orain esango dut`
- **S0005, R15** — can't use `noa`, so: to practise needs to be `praktikatu` with `-ko` added for the future phrases — Build 1: `praktikatuko`; Build 2: `hitz egiten praktikatu`; Build 3: `esaten praktikatuko dut`; Build 4: `orain praktikatuko dut`; Build 5: `hitz egiten praktikatu nahi dut`; Build 6: `Euskaraz hitz egiten praktikatuko dut`; Build 7: `zurekin hitz egiten praktikatuko dut`

### 24/04
- **S0005, R16** — LEGO "with someone else" is `beste batekin`; Build 1: `beste bati zerbait esango diot`; Build 2: `beste batekin ikasten saiatzen ari naiz`; Build 3: `beste batekin euskaraz hitz egin nahi dut`; Build 4: `beste batekin hitz egiten praktikatuko dut`
- **S0006, R17** — Build 2: `hitz esango dut`; Build 6: `zuri hitz esan nahi dizut`
- **S0006, R18** — Build 2: `zerbait` (can't have `bat` after it); Build 3: `hitz bat euskaraz`; Build 5: `orain hitz bat esango dut`; Build 6: `hitz bat ikasi nahi dut`; Build 7: `hitz bat esan nahi dut euskaraz`; Cons 1: `gauza bat esaten saiatzen ari naiz`
- **S0006, R19** — Build 2: the Basque is for "I want to remember", for just "want to remember" it would be `gogoratu nahi`; Build 3: `zerbait gogoratuko dut`; Build 6: `orain gogoratzen saiatzen ari naiz`
- **S0006, R20** — LEGO: `saiatzen ari`; Build 1: `gogoratzen saiatzen ari`; Build 2: `hitz bat gogoratzen saiatzen ari`; Build 3: `zerbait gogoratzen saiatzen ari naiz`; Build 4: `zerbait hitz egiten saiatzen ari naiz euskaraz`; Build 5: `orain zerbait ikasten saiatzen ari naiz`; Build 6: `nola esan gogoratzen saiatzen ari naiz`; `hitz egiten praktikatzen saiatzen ari naiz`; Cons 2: `zerbait esaten saiatzen ari naiz euskaraz`

## Regex-scan hits across all 668 seeds

A mechanical scan against the identified patterns (below) finds **56 seeds** with at least one known pattern. Use these as prioritised targets; the remaining seeds may still have issues Deborah hasn't reviewed.

### Pattern → affected seeds

#### future-noa (13 seeds)
_Wrong future tense (noa instead of -ko/-go)_

S0005, S0011, S0017, S0023, S0032, S0035, S0039, S0046, S0050, S0109, S0110, S0130, S0246

#### ikasten-nahi (7 seeds)
_Gerund ikasten + nahi (should be ikasi + nahi)_

S0002, S0006, S0014, S0017, S0032, S0139, S0199

#### esan-saiatzen (4 seeds)
_Perfect esan with saiatzen (should be esaten)_

S0004, S0006, S0017, S0100

#### maizen (11 seeds)
_`maizen` used outside `ahalik eta` context_

S0003, S0004, S0005, S0006, S0012, S0020, S0046, S0048, S0086, S0119, S0157

#### beste-norbaitek (1 seed)
_Wrong case: beste norbaitek (should be beste batekin)_

S0005

#### zerbait-bat (1 seed)
_Invalid zerbait + bat_

S0006

#### praktikatzera (46 seeds)
_`praktikatzera` form — consider `praktikatu` + `-ko`_

S0005, S0009, S0017, S0018, S0021, S0023, S0024, S0027, S0033, S0042, S0047, S0050, S0054, S0078, S0086, S0099, S0103, S0110, S0124, S0126, S0139, S0150, S0153, S0170, S0182, S0192, S0193, S0199, S0217, S0218, S0224, S0227, S0235, S0236, S0239, S0240, S0246, S0253, S0258, S0264, S0279, S0285, S0290, S0294, S0299, S0300

#### euskaraz-ikas (2 seeds)
_`euskaraz` + `ikasi`/`ikasten` (should be `euskara`, absolutive)_

S0012, S0100

## Rebuild methodology notes

- Preserve the seed-number ↔ intent mapping (re-decompose existing seeds; don't renumber).
- The existing LEGO indexing is reasonable as a starting point but expect to replace 50–80% of phrase texts.
- Validate new phrases against all 9 grammar rules above before committing.
- Consult a Basque-literate reviewer (Deborah) after rebuild; don't ship on Haiku output alone — ergative/absolutive/sociative case marking and tense/aspect/mood distinctions are too easy to get subtly wrong.
- A per-seed pattern-tag map is at `docs/eus_for_eng-rebuild-patterns.json` — structured data version of the seed list above.
