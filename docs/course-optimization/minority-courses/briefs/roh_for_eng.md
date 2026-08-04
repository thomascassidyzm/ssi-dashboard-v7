# Romansh (`roh_for_eng`) — Opus handoff brief

**Status:** All 10 reference seeds survived independent re-verification unchanged; every construction is corpus-attested piecewise against RG sources except one collocation (seed 7's `sa stentar uschè fitg` without complement). Fable-level attestation was sufficient for this stage — but **native RG sign-off is REQUIRED (not optional)** on seeds 5/7, the voice-gender adjective gate, and the elision/comma conventions **before decomposition or any TTS**. Biggest risk: RG resources are thin and corpus texts bleed the five valley idioms — a plausible-looking attested string may not be RG at all.

## Orthography

**Standard: Rumantsch Grischun (RG)** — the official pan-regional written standard — NOT any of the five valley idioms (Sursilvan, Sutsilvan, Surmiran, Puter, Vallader). Rationale: RG is the only supra-regional norm with usable written corpus coverage.

**Sources, in order of trust:**
1. **rm.wikipedia article space** — largely RG; use for attestation via the MediaWiki search API: `https://rm.wikipedia.org/w/api.php?action=query&list=search&srsearch=%22exact+phrase%22`. It rate-limits after ~8 rapid queries — sleep 2–3s between calls.
2. **Pledari Grond** dictionary — authoritative for lemmas and listed 1sg forms, but the API returns 401 and the site is JS-only; treat it as a manual-lookup source, not scriptable.
3. **Wikisource / memoirs / older texts** — mostly NOT RG (Sursilvan/Vallader). Never copy a string from these without idiom-checking it first.

**Idiom tell-tales (reject the page/string if you see these):**
| RG (correct) | Idiom bleed (reject) |
|---|---|
| `jau` (I) | `eu` (Vallader), `jeu` (Sursilvan) |
| `in`/`ina` (a) | `ün` (Vallader/Puter) |
| `che` (that) | `cha` (Vallader) |
| `tai` (you, tonic) | `tei` (Sursilvan) |

**Hard spelling rules:** `segir` (not *segiur*/*sicur*); `uschè` with grave accent; `betg` (not *buc*/*brich* — idiom forms); `tge` for interrogative/free-relative "what". Do not import Italian or French spellings for anything.

## Core grammar the builder needs

**Word order.** SVO with the subject pronoun **present** — RG is NOT pro-drop like Italian. But a fronted adverb/object triggers **verb–subject inversion** (`na poss jau...`, `emprov jau in pau uschia`). The course avoids inversion entirely: **keep all adverbs clause-final** (`...ussa`, `...oz`). Preserve this in every new seed or inversion leaks into LEGOs.

**1sg present — verified forms only (all attested):**
| Infinitive | 1sg | Class rule |
|---|---|---|
| vulair (want) | `jau vi` | irregular |
| pudair (can) | `jau poss` | irregular |
| esser (be) | `jau sun` | irregular |
| vegnir (come; futurate aux) | `jau vegn` | irregular |
| empruvar (try/attempt) | `jau emprov` | regular -ar: zero ending, stem change |
| discurrer (speak) | `jau discur` | regular -er: zero ending |
| manegiar (mean) | `jau manegel` | **-giar class: 1sg in -el** |

Rule of thumb: regular -ar/-er → zero ending with possible stem-vowel change; -giar → -el. **Every new verb must be verified individually** (Pledari Grond lists 1sg in parentheses). Never guess by analogy to Italian -o or French forms. If you cannot attest a form, flag it — do not invent.

**Negation.** Double: `na` + verb + `betg`. `na` elides to `n'` before a vowel (`n'è betg`). Dropping `na` is spoken-idiom style — never in course text.

**Reflexives.** Dictionary citation form is `sa X`, but the reflexive **agrees with the subject even on infinitives**: `jau ... ma stentar / ma regurdar` — never `sa` with a 1sg subject. Paradigm: jau **ma** / ti **ta** / el·ella **sa** / nus **ans** / vus **as** / els·ellas **sa**. Convert every dictionary reflexive per person.

**Future/intention.** `vegnir a(d) + infinitive`: `jau vegn a trenar`, `jau vegn ad empruvar`. No other future form is used in seeds 1–10.

**No progressive.** English "I'm trying / I'm going to" → RG simple present or `vegnir a + inf`. Never calque a *star + gerund* form.

**Three elision rules — do not conflate:**
1. `da` + vowel-initial **infinitive** → `d'` — course convention, matches the 6:1 corpus majority over `dad` (`d'emprender`, not `dad emprender`). `da` does NOT elide before consonants (`da ma regurdar`, `da declerar`) and this convention is stated for infinitives; before `l'` it stays `da` (`da l'entira frasa`).
2. `a` → `ad` before vowel — **mandatory**, not stylistic (`vegn ad empruvar` but `vegn a trenar`).
3. `che` → `ch'` **only before vowels** (`tge ch'el` but `tge che jau` — *j* counts as a consonant).

**Complementation patterns (attested):** `empruvar da + inf` · `trenar da + inf` · `sa regurdar da + NP` · `vegnir a(d) + inf` · `co + inf` (how-to) · `tge che + finite` (free relative "what") · `sche + finite` (if/whether, indirect question).

**Articles/gender:** `in` (m) / `ina` (f); definite `la frasa` (f), `l'` before vowel (`l'entira frasa`). `pled` is **masculine** → `in pled`. Verify the gender of every new noun — do not guess (the original grounding itself got `pled` wrong).

## LOCKED DECISIONS (contracts Opus must NOT break)

**Register:** "you" = **singular informal** `ti`/tonic `tai` throughout (`cun tai`). No vus-course.

**ZUT registry — one known → one target, course-wide:**
- [ ] I want → `jau vi` (vulair)
- [ ] to try / I'm trying (= attempt) → `empruvar (da)` / `jau emprov`
- [ ] **to try as hard as** → `ma stentar uschè fitg sco che` — chunked known side so bare "try" keeps a single target (`empruvar`). Never let `sa stentar` surface under bare "try".
- [ ] to speak → `discurrer`; I speak → `jau discur`
- [ ] to learn → `emprender`
- [ ] to say → `dir`
- [ ] to explain → `declerar`
- [ ] I mean → `jau manegel` (manegiar)
- [ ] to remember → `sa regurdar` (converted per person: `ma regurdar` with jau) — object linked by `da` (see decomposition contract below)
- [ ] to practise → `trenar da` (pending native check #2 — do not switch to `s'exercitar` without native ruling; it has zero rm.wiki hits)
- [ ] I can → `jau poss` (pudair)
- [ ] I'm going to → `jau vegn a(d)` + inf (a/ad sealed with the following infinitive — see decompositions)
- [ ] I'm not sure → `jau na sun betg segir` (gender gate open on segir/segira)
- [ ] if / whether → `sche` (not schebain, pending native check #4)
- [ ] what (free relative) → `tge che`
- [ ] how to → `co` + infinitive
- [ ] something → `insatge`; someone else → `insatgi auter`
- [ ] now → `ussa` (clause-final); today → `oz` (clause-final)
- [ ] a little → `in pau`; a word → `in pled` (m); the whole sentence → `l'entira frasa`
- [ ] Romansh → `rumantsch`; **in Romansh** (saying/naming) → `per rumantsch` (never `en rumantsch`)
- [ ] as X as possible → `uschè X sco pussaivel`; as X as [clause] → `uschè X sco che` + finite — **two distinct LEGOs, never collapsed**

**Structural contracts:**
- [ ] Subject pronoun always present; adverbs clause-final; no fronting, no inversion.
- [ ] Elision rules 1–3 above applied exactly; `d'` convention (not `dad`) is codified.
- [ ] Negation always `na ... betg`, sealed inside one LEGO (see seed 10).
- [ ] `regurdar`'s object linker `da/d'` travels with the **object** LEGO, not the verb LEGO (consistent across seeds 6 and 10).
- [ ] German-style comma before `sche`/`che` subordinate clauses: **provisionally KEEP** (corpus-attested) — but this is decide-once; if native review drops it, drop it course-wide before decomposition.
- [ ] Predicative adjectives agree with the **recording voice's gender** — blocked until voice decision (native-check #3).

## The 10 reference seeds

| n | English | Target | Gloss | Conf. |
|---|---|---|---|---|
| 1 | I want to speak Romansh with you now | jau vi discurrer rumantsch cun tai ussa | I want(1sg) to-speak Romansh with you(sg tonic) now | high |
| 2 | I'm trying to learn | jau emprov d'emprender | I try(1sg) to learn | high |
| 3 | how to speak as often as possible | co discurrer uschè savens sco pussaivel | how to-speak as often as possible | high |
| 4 | how to say something in Romansh | co dir insatge per rumantsch | how to-say something in Romansh | high |
| 5 | I'm going to practise speaking with someone else | jau vegn a trenar da discurrer cun insatgi auter | I come(1sg) to practise of to-speak with someone other | med-high |
| 6 | I'm trying to remember a word | jau emprov da ma regurdar d'in pled | I try of myself remember of-a word | high |
| 7 | I want to try as hard as I can today | jau vi ma stentar uschè fitg sco che jau poss oz | I want myself to-exert as hard as that I can today | med-high |
| 8 | I'm going to try to explain what I mean | jau vegn ad empruvar da declerar tge che jau manegel | I come to to-try of to-explain what that I mean(1sg) | high |
| 9 | I speak a little Romansh now | jau discur in pau rumantsch ussa | I speak(1sg) a little Romansh now | high |
| 10 | I'm not sure if I can remember the whole sentence | jau na sun betg segir, sche jau poss ma regurdar da l'entira frasa | I not am not sure, if I can myself remember of the-whole sentence | high |

Rule-carrying notes: **3** — fragment, no question mark (LEGO-debut style); distinct from seed 7's `sco che` frame. **5** — `a` stays `a` before consonant-initial `trenar` (contrast seed 8's `ad empruvar`). **6** — `da ma` does not elide (m = consonant); `d'in` does. **7** — `sa stentar uschè fitg` absolute is the only unattested string in the set: **native check blocks decomposition of this seed**. **10** — `segir/segira` gender gate blocks TTS course-wide.

## Worked decompositions

These are the pattern to copy. Format: `known atom → target atom`, in order; SEALED = never split further.

**Seed 1** — `jau vi discurrer rumantsch cun tai ussa`
1. `I want` → `jau vi` — SEALED (pronoun + irregular 1sg is one unit; `vi` never appears without `jau` in this course)
2. `to speak` → `discurrer`
3. `Romansh` → `rumantsch`
4. `with you` → `cun tai` — SEALED (tonic form `tai` is licensed by the preposition; splitting would expose `tai` as a free-standing "you", which it is not)
5. `now` → `ussa`

**Seed 8** — `jau vegn ad empruvar da declerar tge che jau manegel`
1. `I'm going to try` → `jau vegn ad empruvar` — SEALED. The `ad` elision is conditioned by vowel-initial `empruvar`; a bare LEGO "I'm going to" would need two surface forms (`jau vegn a` / `jau vegn ad`, cf. seed 5's `vegn a trenar`), which breaks tiling. **Contract: always seal `vegnir a(d)` with its infinitive.** ZUT stays clean because seed 5 seals as `I'm going to practise` → `jau vegn a trenar`.
2. `to explain` → `da declerar` — SEALED (the `da` linker belongs to the infinitive it introduces)
3. `what` → `tge che` — SEALED (free relative is always the two-word unit; `che` here does NOT elide because `jau` follows — j is a consonant)
4. `I mean` → `jau manegel`

**Seed 10** — `jau na sun betg segir, sche jau poss ma regurdar da l'entira frasa`
1. `I'm not sure` → `jau na sun betg segir` — SEALED (discontinuous `na ... betg` wraps the verb; any split produces un-tileable negation fragments. Gender gate: `segir`→`segira` if female voice)
2. `if` → `sche` (comma attaches to the preceding LEGO if the keep-comma decision stands)
3. `I can` → `jau poss`
4. `remember` → `ma regurdar` — SEALED (reflexive `ma` agrees with jau; never detach it). Known side "remember" (finite context) vs seed 6's "to remember" → `da ma regurdar` — different known strings, ZUT-safe.
5. `the whole sentence` → `da l'entira frasa` — SEALED, and note the **contract**: `regurdar`'s complement linker `da/d'` fuses into the object LEGO (same move as seed 6's `a word` → `d'in pled`). This keeps elision inside a single LEGO instead of across a boundary. ZUT caveat: if bare `a word` → `in pled` ever debuts outside a remember-frame, resolve the duplicate-known collision by the standard expand/rename move — do not create a second target silently.

## Gotchas

1. **Standard bleed** — corpus mixes five idioms with RG. rm.wikipedia article space ≈ RG; Wikisource mostly is NOT. Check tell-tales (`eu/jeu`, `ün`, `cha`, `tei`) before trusting any attested string.
2. **Three elision rules, never conflated** — `da`+V-infinitive → `d'` (convention, 6:1 corpus); `a`→`ad` before vowel (mandatory); `che`→`ch'` only before vowels (`tge che jau` is correct).
3. **1sg endings vary by class** — -ar/-er → zero + stem change (`emprov`, `discur`); -giar → -el (`manegel`); irregulars `vi`, `poss`, `sun`, `vegn`. Verify every new verb; no Italian -o, no French forms.
4. **Reflexive agrees with subject, even on infinitives** — `jau ... ma stentar`, never `sa` with 1sg. Convert dictionary `sa X` per person: ma/ta/sa/ans/as/sa.
5. **Double negation** — `na ... betg` (`n'è betg` before vowel). `betg` alone is spoken style; never in course text.
6. **Inversion trap** — fronted adverb/object → verb–subject inversion (`na poss jau...`). Keep adverbs clause-final always.
7. **Predicative adjective gender gate** — `segir/segira` etc. must match the recording voice. Blocked for TTS until voice gender decided; propagates course-wide.
8. **"in Romansh" = `per rumantsch`** — `en rumantsch` is a calque; never use it in the saying/naming frame.
9. **Two "as...as" frames** — `uschè X sco pussaivel` (no che) vs `uschè X sco che` + finite clause. Distinct LEGOs; do not collapse.
10. **ZUT on "try"** — `empruvar` = attempt (seeds 2/6/8) vs `sa stentar` = strive (seed 7). Seed 7's known side is chunked as "to try as hard as" precisely to protect bare "try".
11. **`pled` is masculine** → `in pled`. The original grounding offered `ina pled` — wrong. Check every noun's gender.
12. **No progressive** — simple present or `vegnir a` + inf. Never *star + gerund*.
13. **Comma before `che`/`sche` subordinates** — German-style, attested. Decide-once (provisionally KEEP); must be consistent for decomposition and TTS prosody.
14. **Tooling** — Pledari Grond API 401s, site JS-only. Attest via rm.wikipedia MediaWiki search API with exact-phrase quotes; rate-limits after ~8 rapid queries — sleep 2–3s.

## Native-check questions (blocking items marked)

1. **[BLOCKS seed-7 decomposition]** Is `jau vi ma stentar uschè fitg sco che jau poss oz` natural RG? (a) Can `sa stentar` stand without a da/per complement under a degree adverb? (b) Would `tant sco pussaivel` or `il pli fitg pussaivel` beat `uschè fitg sco che jau poss`? This fixes the "as X as" LEGO.
2. Seed 5: is `trenar da discurrer` natural for practising speaking with a person, or does `trenar` skew sport/drill (alternative `m'exercitar da discurrer` — but zero rm.wiki hits)? Corpus favours trenar; confirm register.
3. **[BLOCKS TTS course-wide]** Voice gender: male (`segir`) or female (`segira`)? Propagates to every predicative adjective.
4. Seed 10: is `sche` the right if/whether complementizer after `jau na sun betg segir` (not `schebain`), and should the German-style comma before `sche` be kept in course text?
5. Seeds 1/9: is clause-final `ussa` fully natural, or would a native prefer medial/fronted (fronting triggers inversion, which we avoid — confirm final doesn't sound tacked-on)?
6. Seeds 2/6: confirm the always-`d'` convention reads as normal written RG, and that `jau emprov d'emprender` isn't an awkward near-cognate jingle.
7. Seed 1: confirm `cun tai` is correct RG tonic 2sg (not Sursilvan `tei`) and that `discurrer cun tai` is the natural phrasing.
8. (New) Confirm the definite masculine article form for `pled` in context (`il pled`?) before any seed needs it — not yet attested in the reference set.
9. (New) Confirm 1sg of `emprender` before it is ever used finitely — only the infinitive is attested in seeds 1–10; do not guess `emprend`.

## Instructions to Opus for continuing (seeds 11+)

**Per-seed workflow:**
1. Translate by **assembling locked chunks first** — check every content word and frame against the ZUT registry above before reaching for the dictionary. If the registry has a mapping, you must use it.
2. For each NEW word/frame: look up the lemma (Pledari Grond, manual), verify the needed conjugated form is **listed** (esp. 1sg — class rules in the grammar table), verify noun gender, then **attest the surface string** via the rm.wiki search API (exact-phrase quotes, 2–3s sleeps). Confirm the hit page is RG using the tell-tales before counting it.
3. Apply the structural contracts mechanically: subject pronoun present, adverbs clause-final, `na...betg`, reflexive converted per person, the three elision rules, comma-before-subordinate per the decide-once ruling.
4. Assign confidence honestly: **high** = every joint attested in RG; **medium** = compositional from attested pieces but the exact collocation unattested; below that, **do not ship — flag for native check instead**. RG's corpus is small: absence of attestation is weak evidence against, but presence of an Italian/French-shaped guess is strong evidence you invented it. When torn between a "natural-sounding" Romance form and a duller attested one, take the attested one.
5. Decomposition: copy the worked patterns — seal pronoun+irregular verb, seal `vegnir a(d)`+infinitive, seal `da`+infinitive linkers with their verb, seal reflexive clitics with their verb, fuse complement linkers (`da/d'`) into the object LEGO, seal `na...betg` negation inside one LEGO, seal `tge che` and tonic-pronoun PPs. Never let an elision straddle a LEGO boundary.
6. ZUT maintenance: before introducing any target form, grep the registry for its known string AND its target string. Duplicate known → standard resolution (expand / rename / chunk the known side, as seed 7 did for "try"). Log every new mapping into the registry — it is the course's single source of truth.

**Where to defer rather than guess:** any new verb class beyond -ar/-er/-giar; any tense beyond present and `vegnir a` future; plural agreement; any predicative adjective (gender gate); subordinate word order beyond `sche`/`che` + SVO; prepositional idioms (the `per rumantsch` case shows calques are the default failure mode). For all of these, mark low-confidence, write the specific question into the native-check list, and keep building seeds that don't depend on the answer. **Hard blocks remain:** no decomposition of seed 7 until native-check #1 resolves; no TTS for anything until the voice gender (#3) is decided and recorded in this brief.