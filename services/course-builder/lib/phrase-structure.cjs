/**
 * Phrase structure — deterministic phrase IDs, role computation, n-grams, LEGO position.
 * Pure functions (no DB, no state).
 */

const { normalizeForContainment, checkWordContainment, checkSubstringContainment, normalizePhrase } = require('./text-normalization.cjs');
const { getTargetLang, getCharsPerSyllable, isParticle, isChinese } = require('./language-config.cjs');

// Phrase role prefixes for deterministic IDs
const ROLE_PREFIX = { component: 'C', build: 'B', use: 'U' };

/**
 * Compute phrase_role from position value.
 * 0 = component, 1-7 = build, 8+ = use
 */
function computePhraseRole(position) {
  if (position === 0) return 'component';
  if (position >= 8) return 'use';
  return 'build';
}

/**
 * Deterministic phrase ID: {course_code}:S{NNNN}L{NN}{R}{NN}
 * R = C (component), B (build), U (use)
 * rolePosition = 1-based index within that role for this LEGO
 */
function makePhraseId(course_code, seed_number, lego_index, phrase_role, rolePosition) {
  const s = String(seed_number).padStart(4, '0');
  const l = String(lego_index).padStart(2, '0');
  const r = ROLE_PREFIX[phrase_role] || 'X';
  const p = String(rolePosition).padStart(2, '0');
  return `${course_code}:S${s}L${l}${r}${p}`;
}

/**
 * Extract n-grams from text (for pattern detection).
 */
function extractNgrams(text, n = 3) {
  const words = text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Compute where the LEGO appears in the phrase (start/middle/end).
 */
function computeLegoPosition(phraseTargetText, legoTargetText) {
  if (!phraseTargetText || !legoTargetText) return null;

  const phrase = phraseTargetText.trim();
  const lego = legoTargetText.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;

  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;

  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

/**
 * Compute which other LEGOs appear in a phrase (for coverage-based selection).
 */
function computeConnectedLegoIds(phraseTargetText, primaryLegoTarget, introducedLegos) {
  if (!introducedLegos || !Array.isArray(introducedLegos)) return [];

  const connectedIds = [];
  const normalizedPhrase = phraseTargetText.toLowerCase().trim();
  const normalizedPrimary = primaryLegoTarget.toLowerCase().trim();

  for (const lego of introducedLegos) {
    const legoTarget = (lego.target_text || lego.target || '').toLowerCase().trim();
    if (legoTarget === normalizedPrimary) continue;
    if (legoTarget.length < 2) continue;
    if (normalizedPhrase.includes(legoTarget)) {
      connectedIds.push(lego.lego_id || `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`);
    }
  }

  return connectedIds;
}

/**
 * A practice phrase whose target IS the LEGO's own target teaches nothing —
 * the learner already meets the bare LEGO at intro and debut (both rendered
 * straight from course_legos, see learning-script-generator.cjs "the debut IS
 * the bare LEGO"). Such a row is never played; it only inflates the per-LEGO
 * phrase count. ralph-methodology.md is explicit: a BUILD phrase is the new
 * LEGO plugged into prior vocabulary, NOT the LEGO alone.
 */
function isBareLegoPhrase(phraseTarget, legoTarget) {
  const lego = normalizeForContainment(legoTarget || '');
  if (!lego) return false;
  return normalizeForContainment(phraseTarget || '') === lego;
}

/**
 * Split phrases into the ones that practise the LEGO and the bare-LEGO copies.
 * Accepts either shape in use across the write paths ({target} or {target_text}).
 */
function partitionBareLegoPhrases(phrases, legoTarget) {
  const kept = [];
  const bare = [];
  for (const p of phrases || []) {
    const target = p && (p.target_text != null ? p.target_text : p.target);
    (isBareLegoPhrase(target, legoTarget) ? bare : kept).push(p);
  }
  return { kept, bare };
}

/**
 * Check if LEGO uses BUILD/USE format.
 */
function usesBuildUseFormat(lego) {
  return Array.isArray(lego.build) || Array.isArray(lego.use);
}

/**
 * Validate BUILD/USE phrase structure per ralph-methodology.md.
 */
function checkBuildUsePhrases(lego, courseCode, seedNumber) {
  const charsPerSyllable = getCharsPerSyllable(courseCode);

  // Graduated requirements
  let minBuild = 3;
  let minUse = 5;

  if (seedNumber === 1 && lego.idx === 1) {
    minBuild = 0;
    minUse = 0;
  } else if (seedNumber === 1) {
    minBuild = 1;
    minUse = 1;
  } else if (seedNumber <= 3) {
    minBuild = 1;
    minUse = 1;
  } else if (seedNumber <= 5) {
    minBuild = 3;
    minUse = 5;
  }

  const buildRaw = lego.build || [];
  const useRaw = lego.use || [];
  const legoTarget = (lego.target || '').trim();
  const legoTargetNorm = normalizeForContainment(legoTarget);

  // Filter out component phrases — for character-based languages (Thai, Chinese, Japanese, Korean)
  // use substring containment; for space-delimited languages use word-based containment.
  const charBased = isChinese(courseCode);
  const containsLego = (phraseTarget) => {
    if (charBased) {
      return checkSubstringContainment(legoTarget, phraseTarget, courseCode);
    }
    return checkWordContainment(legoTarget, phraseTarget, courseCode);
  };
  const buildContaining = buildRaw.filter(p => containsLego(p.target || ''));
  const useContaining = useRaw.filter(p => containsLego(p.target || ''));
  const buildComponents = buildRaw.length - buildContaining.length;
  const useComponents = useRaw.length - useContaining.length;
  const componentCount = buildComponents + useComponents;
  if (componentCount > 0) {
    console.log(`  ⚠ ${componentCount} component phrase(s) excluded (don't contain full LEGO target): ${buildComponents} from build[], ${useComponents} from use[]`);
  }

  // A phrase that IS the bare LEGO never counts toward the floor — otherwise the
  // floor can be met by copying the LEGO out as its own practice phrase.
  const buildSplit = partitionBareLegoPhrases(buildContaining, legoTarget);
  const useSplit = partitionBareLegoPhrases(useContaining, legoTarget);
  const build = buildSplit.kept;
  const use = useSplit.kept;
  const bareCount = buildSplit.bare.length + useSplit.bare.length;
  if (bareCount > 0) {
    console.log(`  ⚠ ${bareCount} bare-LEGO phrase(s) excluded (phrase target IS the LEGO "${legoTarget}"): ${buildSplit.bare.length} from build[], ${useSplit.bare.length} from use[]`);
  }
  const bareHint = (n) => n > 0
    ? ` (${n} bare-LEGO phrase(s) don't count — a BUILD/USE phrase is the LEGO used IN a phrase with prior vocabulary, never the LEGO alone)`
    : '';

  // Count validation
  if (build.length < minBuild) {
    return {
      valid: false,
      error: `BUILD: need ${minBuild}+, got ${build.length}${componentCount > 0 ? ` (${componentCount} component phrases excluded)` : ''}${bareHint(buildSplit.bare.length)}`,
      details: { build: build.length, use: use.length, components: componentCount, bare: bareCount, minBuild, minUse },
    };
  }

  if (use.length < minUse) {
    return {
      valid: false,
      error: `USE: need ${minUse}+, got ${use.length}${useComponents > 0 ? ` (${useComponents} component phrases excluded)` : ''}${bareHint(useSplit.bare.length)}`,
      details: { build: build.length, use: use.length, components: componentCount, bare: bareCount, minBuild, minUse },
    };
  }

  // Reject USE phrases with known_score < 5
  const lowKnownScores = use.filter(p => p.known_score && p.known_score < 5);
  if (lowKnownScores.length > 0) {
    return {
      valid: false,
      error: `${lowKnownScores.length} USE phrase(s) have known_score < 5 (broken English). Remove or rewrite them.`,
      details: {
        build: build.length, use: use.length,
        low_known_score_phrases: lowKnownScores.map(p => p.known),
      },
    };
  }

  // Reject USE phrases with target_score < 5
  const lowTargetScores = use.filter(p => p.target_score && p.target_score < 5);
  if (lowTargetScores.length > 0) {
    return {
      valid: false,
      error: `${lowTargetScores.length} USE phrase(s) have target_score < 5. Remove or rewrite them.`,
      details: {
        build: build.length, use: use.length,
        low_target_score_phrases: lowTargetScores.map(p => p.target),
      },
    };
  }

  // Reject duplicate phrases within this LEGO (across BUILD + USE)
  const allPhrases = [...buildRaw, ...useRaw];
  const seen = new Set();
  const duplicates = [];
  for (const p of allPhrases) {
    // normalizePhrase, NOT normalizeForContainment: a statement and the question
    // built from it are two different teaching items, so "?" must survive here.
    const norm = normalizePhrase((p.target || '').trim());
    if (seen.has(norm)) {
      duplicates.push(p.target || p.known || '(empty)');
    }
    seen.add(norm);
  }
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `${duplicates.length} duplicate phrase(s) within this LEGO: ${duplicates.slice(0, 3).map(d => `"${d}"`).join(', ')}`,
      details: { build: build.length, use: use.length, duplicates },
    };
  }

  return {
    valid: true,
    details: {
      build: build.length,
      use: use.length,
      components: componentCount,
      bare: bareCount,
      avgSyllables: use.length > 0 ? (use.reduce((sum, p) => sum + Math.round((p.target || '').length / charsPerSyllable), 0) / use.length).toFixed(1) : 0,
    },
  };
}

/**
 * Get meaningful components for M-LEGO build-up.
 * Filters out particles and self-references.
 */
function getMeaningfulComponents(components, legoTarget) {
  if (!components || !Array.isArray(components)) return [];
  return components.filter(c =>
    c && c.target && !isParticle(c.target) && c.target !== legoTarget
  );
}

/**
 * Generate build-up phrases for M-type LEGO.
 * Returns array of phrase objects ready for insertion.
 */
function generateBuildupPhrases(lego, courseCode) {
  const { seed, idx, known, target, components } = lego;
  const meaningful = getMeaningfulComponents(components, target);

  const buildupPhrases = [];
  const roleCounts = { component: 0, build: 0, use: 0 };

  // Add component build-up phrases
  for (let i = 0; i < meaningful.length; i++) {
    const comp = meaningful[i];
    roleCounts.component++;
    buildupPhrases.push({
      id: makePhraseId(courseCode, seed, idx, 'component', roleCounts.component),
      course_code: courseCode,
      seed_number: seed,
      lego_index: idx,
      position: i + 1,
      known_text: comp.known,
      target_text: comp.target,
      target_text_roman: comp.target_roman || null,
      word_count: comp.target.length,
      lego_count: 1,
      phrase_role: 'component',
      introduce: comp.introduce !== false,
      connected_lego_ids: [],
      lego_position: computeLegoPosition(comp.target, comp.target),
      metadata: { buildup: 'component', component_index: i },
      status: 'draft',
      version: 1,
    });
  }

  // The LEGO itself is NOT emitted as a build phrase. The learner already meets
  // it at intro and debut, both rendered from course_legos — the round generator
  // claims that phrase id whether or not a row exists, so a bare-LEGO build row
  // was never played, only counted. See isBareLegoPhrase above.
  return { buildupPhrases, startPosition: meaningful.length + 1, roleCounts };
}

module.exports = {
  ROLE_PREFIX,
  computePhraseRole,
  makePhraseId,
  extractNgrams,
  computeLegoPosition,
  computeConnectedLegoIds,
  usesBuildUseFormat,
  isBareLegoPhrase,
  partitionBareLegoPhrases,
  checkBuildUsePhrases,
  getMeaningfulComponents,
  generateBuildupPhrases,
};
