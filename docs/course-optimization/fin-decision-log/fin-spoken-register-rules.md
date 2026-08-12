---
name: fin-spoken-register-rules
description: "Kai's native-speaker rules for spoken-Finnish register in fin_for_eng (the SSi \"speak fast, natural, no grammar hurdles\" course)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 47bb2531-fa5b-4493-9010-7ae7dcb728b9
---

Kai is a NATIVE Finnish speaker and is personally calibrating fin_for_eng. Goal: best Finnish course ever — get people SPEAKING fast, spoken register, natural, nothing a native winces at, no grammar-complexity hurdles. Ask him questions / surface borderline phrases / flag wince phrases. See [[project_finnish_danish.md]].

## CONFIRMED RULES (2026-06-04)
- **Spoken pronouns**: mä/sä (sg), me/te, ne (pl); genitive sun/mun/sen; not minä/sinä.
- **se for hän — ALWAYS.** Extends to plural: he→ne, heidän→**niiden** (NOT niitten — too slangy), heitä→niitä. (Kai confirmed 2026-06-04.)
- **Plural subject → SINGULAR verb** everywhere, incl. relative clauses: *jotka puhuu*, *ne puhuu* (NOT jotka puhuvat). (A, confirmed.)
- **Particles stay FULL/clear**: *mutta* (not mut), *että* (not et) — consistent with clear>slangy. (D, confirmed.)
- **NEVER edit the English known side unless absolutely necessary.** (Overarching constraint.)
- **tää** for tämä.
- **"ei oo" / "en oo"** not "ei ole".
- **KEEP full -a/-ä infinitives**: tehdä (NOT tehä), puhua (NOT puhuu), oppia (NOT oppii). KEY PRINCIPLE: don't pre-erode endings — the clear form works in more contexts and isn't too formal; the eroded form (puhuu) is both too slangy AND narrows usable contexts. Learners absorb dropped letters naturally from exposure, so teach the clearer form. "Dropping a single letter is easy to adapt to."
- **pitää = genitive subject**: "sun pitäis", "mun pitää", "meidän pitää" — NEVER "sä pitäisi" (Kai winced at this one).
- **me + passive for 1st plural**: me mennään, me opitaan, me yritettiin — not me menemme.
- **Questions: prefer onko / -ko / -tko** (Onko, Voisitko) over -ks. (Kai thinks he may have gone overboard with -ks; lean standard -ko.)
- **Avoid English calques** (e.g. "järkevä asia tehdä" → "järkevintä"; "tuntea itsemme onnelliseksi" → "olla onnellisia").
- Register target: "clear normal spoken" — NOT formal, NOT slangy. Maximize the contexts a phrase works in.

## PATTERN-LOAD PRINCIPLE (2026-06-04) — critical for sequencing
Don't overload the learner with too many distinct CONSTRUCTION PATTERNS at once, especially early. In Finnish, English "I" maps to different forms depending on the case-frame:
- nominative subject: **mä haluun** (I want), mä puhun, mä oon
- adessive possessive: **mulla on** (I have)
- genitive necessive: **mun pitää** (I must/need)
- partitive experiencer: **mua väsyttää / mua kiinnostaa** (I feel tired / I'm interested)
- allative: **mulle** (to me)
A beginner seeing mä→mulla→mun→mua in quick succession thinks "why does 'I' keep changing?". DON'T over-simplify (patterns must be introduced) — but introduce them deliberately, spaced, never too many at once, especially in the beginning. Where the canonical English forces a frame early, make its first appearance clean and reinforce before adding another.
ACTION: build a construction-frame map of all 668 seeds (tag each seed's subject/experiencer frame), produce the introduction timeline, flag early clustering. This guides translation choices (prefer the form that doesn't introduce a brand-new frame when a seed allows it) and tells Kai where load spikes.

## C — POSSESSIVE-SUFFIX / EXPERIENCER INVESTIGATION (PICK UP HERE next session)
Kai wants to AVOID possessive suffixes wherever possible, WITHOUT editing the English. Tasks:
1. Audit every fin_for_eng target using a possessive suffix (itsensä/itsemme, nimeni, -ni/-si/-nsa/-mme/-nne, toisillemme) → list them, propose suffix-free Finnish-only rephrasings.
2. 'tuntea' audit: "tuntea itsensä onnelliseksi" (feel happy, S0106) is bad — remove it. BUT first check whether 'tuntea' is load-bearing ELSEWHERE in the course before repurposing/dropping it.
3. Tiredness (S0039 = "mä oon vähän väsynyt"): Kai prefers experiencer pattern "**mua väsyttää** (vähän)". Check what en-fi.json used originally. Apply where tiredness appears.
4. Happiness has NO clean positive experiencer verb (masentaa/jännittää/ahdistaa all negative) → can't mirror väsyttää. Keep "mä oon onnellinen/iloinen" or find another rephrase. Note the asymmetry.
5. MIND PATTERN LOAD: "mua väsyttää" introduces the partitive-experiencer frame — sequence it; don't pile new frames early (see pattern-load principle above).

## OPEN / still TBD
- kanssa vs kaa; meidän vs meiän.
- Conditional 3rd-person -i drop (soittais, tulis) — looks like yes.
- Demonstratives toi/noi/nää?

## STATUS (2026-06-04)
fin_for_eng translation COMPLETE: 668/668 (237 reused from en-fi.json curated + 431 agent-translated in spoken register, periods stripped). Mid native-calibration with Kai. Confirmed quick wins to apply in the full scan: A (plural→sg verb), B (he→ne/niiden), D (full particles mutta/että), + the 'sulles'→'sulle' typo (S0054). Then the C investigation, then full register/wince scan tuned to these rules. Resume when usage resets.

## DATA BUG (separate from register) — fin_for_eng English known side
The {target}=Finnish substitution corrupted English words containing the stem "fin/fini": "finish"→"Finnishish" (S0011), "definitely"→"deFinnishitely" (S0117). Likely affects every seed with finish/definitely/find/fine/finally etc. Needs a known_text repair scan. The Finnish translations are OK (agent inferred intent). Check whether canonical_seeds source_text or the init substitution is the culprit (and whether other for_X courses share the pattern).
