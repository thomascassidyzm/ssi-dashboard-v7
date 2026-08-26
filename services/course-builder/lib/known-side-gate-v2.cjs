/**
 * KNOWN-side untaught-word gate, v2 — script-aware, and it can say "I could not check".
 *
 * REQUIREMENT 1 (Kai, 2026-08-18): "add a way for it to tell us if it didn't check because of the
 * letters (or whatever other issues it runs into), rather than saying they passed."
 *
 * So every verdict is one of THREE, never two:
 *
 *   PASS       every token resolved to introduced vocabulary or the free class
 *   VIOLATION  a token is vocabulary the learner has demonstrably not been given
 *   UNCHECKED  the gate could not answer, WITH A REASON CODE
 *
 * UNCHECKED is not a soft pass and must never be counted as one. It is the outcome the v1 gate
 * was silently reporting as PASS on 31 courses.
 *
 * REQUIREMENT 2 (Kai, same message): "remember the rules about some 'new' items being allowed on
 * the known side, if it makes sense to the learner". The known side is the learner's OWN language
 * and is permitted to run ahead of its formal introductions where it remains answerable. The
 * adjudication used in the earlier eng_for_X sweeps (docs/course-optimization/eng-for-x-known-side-
 * pilot.md + -findings.md, 2026-06-15/16) is reproduced here as four exemptions, applied in this
 * order, so this sweep is consistent with those:
 *
 *   E1 free class    — function words / glue, never "introduced", always permitted (contract-authored)
 *   E2 inflection    — a form of an already-introduced lemma is not new vocabulary
 *   E3 NPI licensing — an NPI under a licensing operator is not a violation; only in a plain
 *                      positive declarative is it one
 *   E4 machinery     — grammatical machinery is licensed by its carrier's debut, not by gloss
 *
 * and the pilot's fifth ruling is honoured by omission: naturalness / authoring quality is OUT OF
 * SCOPE of the answerability check and is never counted as a violation here.
 *
 * ESTATE RULE (HANDOFF-kai-eng-for-x.md §3, and CLAUDE.md): no regex ever makes a LANGUAGE
 * JUDGMENT. E2 is a language judgment. This module therefore resolves inflection only where the
 * contract's agent-authored `stemStrip` licenses it; where that is inconclusive on an inflecting
 * known side it returns UNCHECKED(morphology_unresolved) and the row goes to the agent lane. It
 * does NOT guess a pass and it does NOT guess a violation.
 *
 * Pure. No DB, no I/O. The caller supplies the inventory.
 */

const {
  REASON, REASON_TEXT, segmentKnown, detectScript, normalizeKnown,
  resolveByStemStrip, resolveByReduplication, stemPrefixHit, anyStemInside, tileUncovered,
  DEFAULT_MORPHOLOGY,
} = require('./known-side-script.cjs');

const STATUS = { PASS: 'pass', VIOLATION: 'violation', UNCHECKED: 'unchecked' };

/**
 * Normalise either contract schema into one shape.
 *
 * Two schemas exist on this estate and the v1 gate only read the first, which is the SECOND
 * half of the eng_for_X bug: the 2026-06-15 briefs ship `freeClass`/`npi`/`negation`/
 * `knownConstructions`, the v1 gate reads `freeGlue`/`npiTokens`/`negationWords`/`constructions`.
 * A brief-schema contract therefore compiled to an EMPTY free class — so even had the tokenizer
 * worked, every function word would have been reported as a violation. Both are read here.
 */
function normalizeContract(contract) {
  if (!contract) return null;
  const script = contract.script || null;
  const norm = (arr) => (arr || []).map((s) => normalizeKnown(s)).filter(Boolean);
  return {
    raw: contract,
    course_code: contract.course_code,
    known_lang: contract.known_lang || null,
    known_lang_name: contract.known_lang_name || contract.known_lang || null,
    ratified: contract.ratified || null,
    script,
    segmentation: contract.segmentation || null,
    morphology: contract.morphology || (script ? DEFAULT_MORPHOLOGY[script] : null) || null,
    stemStrip: (contract.stemStrip || []).slice().sort((a, b) => b.length - a.length),
    stemMinLen: contract.stemMinLen || 2,
    // Opt-in prefix-derivation resolver (Yoruba CV-reduplication gerund). Null for every
    // contract that does not declare it, so existing behaviour is untouched.
    reduplicativeNominal: contract.reduplicativeNominal || null,
    // schema A (legacy, *_for_eng)          schema B (2026-06 briefs)
    freeClass: new Set([...norm(contract.freeGlue), ...norm(contract.freeClass)]),
    npi: new Set([...norm(contract.npiTokens), ...norm(contract.npi)]),
    negation: new Set([...norm(contract.negationWords), ...norm(contract.negation)]),
    negationMarkers: contract.negationMarkers || null,
    npiLicensing: contract.npiLicensing || null,
    constructions: contract.constructions || [],
    knownConstructions: contract.knownConstructions || [],
    glossUnits: contract.glossUnits || [],
    glossSynonyms: contract.glossSynonyms || {},
  };
}

/**
 * Build the checking context for one course.
 *
 * @param contract  a raw contract object (either schema), or null
 * @param inventory Map(normalizedForm -> firstPosition). Positions are seed numbers or round
 *                  numbers; the caller picks one unit and uses it consistently.
 * @param opts      { knownLang, courseCode }
 */
function buildContext(contract, inventory, opts = {}) {
  const c = normalizeContract(contract);
  const blockers = [];

  if (!c) {
    blockers.push({ reason: REASON.NO_CONTRACT, detail: `${REASON_TEXT.no_contract} (${opts.courseCode || '?'})` });
  } else if (opts.knownLang && c.known_lang && c.known_lang !== opts.knownLang) {
    blockers.push({ reason: REASON.CONTRACT_LANG_MISMATCH, detail: `${REASON_TEXT.contract_lang_mismatch}: contract=${c.known_lang} course=${opts.knownLang}` });
  }
  if (!inventory || inventory.size === 0) {
    blockers.push({ reason: REASON.NO_VOCAB_INVENTORY, detail: `${REASON_TEXT.no_vocab_inventory} (${opts.courseCode || '?'})` });
  }

  return {
    contract: c,
    inventory: inventory || new Map(),
    inventoryList: [...(inventory ? inventory.keys() : [])].sort((a, b) => b.length - a.length),
    knownLang: opts.knownLang || (c && c.known_lang) || null,
    courseCode: opts.courseCode || null,
    // Non-empty ⇒ EVERY phrase in this course is UNCHECKED, whatever the token scan says.
    blockers,
  };
}

/** Is this prompt negated / non-veridical, i.e. does it license an NPI (exemption E3)? */
function isNegated(text, c) {
  if (!c) return false;
  if (c.negationMarkers) {
    const re = c.negationMarkers instanceof RegExp ? c.negationMarkers : new RegExp(c.negationMarkers, 'i');
    if (re.test(text)) return true;
  }
  const norm = normalizeKnown(text);
  for (const n of c.negation) if (n && norm.includes(n)) return true;
  // Interrogatives are licensing environments for NPIs in every brief on this estate.
  if (/[?？؟]/.test(text)) return true;
  return false;
}

/**
 * Check one known-side prompt.
 *
 * @param known      the prompt text in the learner's own language
 * @param currentPos the seed/round at which the learner meets it
 * @param ctx        from buildContext()
 * @returns {{status, violations: [], unchecked: [], tokens: number, script, strategy}}
 */
function checkKnownSideV2(known, currentPos, ctx) {
  const c = ctx.contract;
  const out = { status: STATUS.UNCHECKED, violations: [], unchecked: [], tokens: 0, script: null, strategy: null };

  // Course-level blockers dominate. This is the loud replacement for `if (contract && ...)`,
  // whose else-branch was silence.
  if (ctx.blockers.length) {
    out.unchecked = ctx.blockers.slice();
    out.script = detectScript(known);
    return out;
  }

  const expand = c.known_lang === 'eng';
  const seg = segmentKnown(known, { script: c.script, segmentation: c.segmentation, expandContractions: expand });
  out.script = seg.script;
  out.strategy = seg.strategy;
  out.tokens = seg.tokens.length;
  if (seg.unchecked.length) out.unchecked.push(...seg.unchecked);

  // A segmentation failure means we know nothing about this prompt. Never a pass.
  const fatal = new Set([REASON.EMPTY_TEXT, REASON.SCRIPT_UNSUPPORTED, REASON.SEGMENTER_UNAVAILABLE, REASON.TOKENIZER_EMPTY]);
  if (out.unchecked.some((u) => fatal.has(u.reason))) return out;

  const negated = isNegated(known, c);
  const morph = c.morphology || 'fusional';

  // ── No-space scripts: DP-tile the whole string rather than trust word boundaries ──
  // Japanese/Chinese/Thai have no orthographic word boundaries, and a dictionary segmenter's
  // boundaries are its own, not the course's LEGO boundaries. Tiling asks the question that
  // actually matters — "is every character of this prompt covered by something taught?" —
  // without needing the two boundary sets to agree.
  if (seg.strategy === 'dictionary') {
    const text = normalizeKnown(known, { expandContractions: expand }).replace(/\s+/g, '');
    const tileable = [...ctx.inventoryList, ...c.freeClass];
    const uncovered = tileUncovered(text, tileable);
    if (!uncovered) {
      out.status = STATUS.PASS;
      return out;
    }
    // Localise the failure to a segmenter token for a human-readable report.
    const hit = seg.tokens.find((t) => uncovered.includes(t)) || uncovered;
    if (morph === 'isolating') {
      out.status = STATUS.VIOLATION;
      out.violations.push({ token: hit, uncovered, reason: 'untiled', detail: `no introduced vocabulary covers "${uncovered}"`, confidence: 'high' });
    } else {
      // Japanese/Korean: an untiled tail is usually inflectional morphology hanging off a
      // taught stem, which is exemption E2 territory and a language judgment. Refuse.
      const stem = anyStemInside(uncovered, ctx.inventoryList, c.stemMinLen);
      if (stem) {
        out.status = STATUS.UNCHECKED;
        out.unchecked.push({ reason: REASON.MORPHOLOGY_UNRESOLVED, detail: `${REASON_TEXT.morphology_unresolved}: "${uncovered}" contains introduced "${stem}"`, token: hit });
      } else {
        out.status = STATUS.VIOLATION;
        out.violations.push({ token: hit, uncovered, reason: 'untiled', detail: `no introduced vocabulary appears anywhere in "${uncovered}"`, confidence: 'high' });
      }
    }
    return out;
  }

  // ── Space-segmented scripts ──
  for (const tok of seg.tokens) {
    // E1 — free class. Function words are never "introduced"; this is the largest single
    // source of false positives and the reason a brief-schema contract read by the v1 gate
    // would have flagged everything.
    if (c.freeClass.has(tok)) continue;

    // E3 — NPI under licensing. Only a plain positive declarative makes an NPI a violation.
    if (c.npi.has(tok)) {
      if (negated) continue;
      out.violations.push({ token: tok, reason: 'npi_unlicensed', detail: `NPI "${tok}" in a positive declarative`, confidence: 'borderline' });
      continue;
    }
    // Negation itself is machinery, licensed by its construction's debut (E4). Where the
    // contract declares no negation construction we cannot date it, so we do not judge it.
    if (c.negation.has(tok)) continue;

    // Exact introduced form.
    const fp = ctx.inventory.get(tok);
    if (fp != null) {
      if (fp > currentPos) {
        out.violations.push({ token: tok, reason: 'not_introduced_until', firstPos: fp, detail: `"${tok}" is not introduced until ${fp}`, confidence: 'high' });
      }
      continue;
    }

    // E2 — inflection of an introduced lemma, but ONLY where the contract's agent-authored
    // stemStrip licenses the reduction.
    const lemma = resolveByStemStrip(tok, ctx.inventory, c.stemStrip, c.stemMinLen);
    if (lemma != null) {
      const lp = ctx.inventory.get(lemma);
      if (lp != null && lp > currentPos) {
        out.violations.push({ token: tok, reason: 'not_introduced_until', lemma, firstPos: lp, detail: `"${tok}" (lemma "${lemma}") is not introduced until ${lp}`, confidence: 'high' });
      }
      continue;
    }

    // E2b — contract-declared PREFIX derivation. stemStrip is suffix-only, so a language whose one
    // productive affix is a prefix (Yoruba's CV-reduplication gerund) had no way to express E2 at
    // all. Opt-in per contract; dates the token against its base exactly as stemStrip does, so a
    // derivation of a LATER-taught base is still a violation.
    const base = resolveByReduplication(tok, ctx.inventory, c.reduplicativeNominal);
    if (base != null) {
      const bp = ctx.inventory.get(base);
      if (bp != null && bp > currentPos) {
        out.violations.push({ token: tok, lemma: base, reason: 'not_introduced_until', firstPos: bp, detail: `"${tok}" (derived from "${base}") is not introduced until ${bp}`, confidence: 'high' });
      }
      continue;
    }

    if (morph === 'isolating') {
      // No morphology to hide behind: an unmatched token IS new vocabulary.
      out.violations.push({ token: tok, reason: 'unknown_gloss', detail: `"${tok}" was never introduced`, confidence: 'high' });
      continue;
    }

    // Inflecting known side. Is there ANY introduced material in this token?
    const pre = stemPrefixHit(tok, ctx.inventory, c.stemMinLen);
    const inside = pre || anyStemInside(tok, ctx.inventoryList, c.stemMinLen);
    if (inside) {
      // Could be an inflection of taught vocabulary, could be a compound hiding a new lemma.
      // That is a language judgment. Refuse it — loudly.
      out.unchecked.push({ reason: REASON.MORPHOLOGY_UNRESOLVED, detail: `${REASON_TEXT.morphology_unresolved}: "${tok}" contains introduced "${inside}"`, token: tok });
      continue;
    }
    // No introduced material anywhere in the token, under any segmentation. New vocabulary
    // by any reading — this survives the morphology objection and is the high-confidence class.
    out.violations.push({ token: tok, reason: 'unknown_gloss', detail: `"${tok}" shares no introduced stem with anything taught by ${currentPos}`, confidence: 'high' });
  }

  if (out.violations.length) out.status = STATUS.VIOLATION;
  else if (out.unchecked.length) out.status = STATUS.UNCHECKED;
  else out.status = STATUS.PASS;
  return out;
}

module.exports = { STATUS, REASON, REASON_TEXT, normalizeContract, buildContext, checkKnownSideV2, isNegated };
