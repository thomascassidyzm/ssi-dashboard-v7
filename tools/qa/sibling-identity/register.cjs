/**
 * THE INTENT REGISTER — do these siblings have to DIFFER from each other?
 *
 * The estate's familiar bug is two things that must AGREE with nothing comparing
 * them. This is that shape inverted: two things that must DIFFER, with nothing
 * comparing them. A flow variant's entire reason to exist is that it differs from
 * its sibling variant under the same key; if it is byte-identical to that sibling
 * it fails its own definition — and it fails SILENTLY, because the row is
 * well-formed, non-null and correctly counted, so every count-based and
 * null-based audit passes it. (Job #264, two rows of the South Welsh health pod.)
 *
 * ── WHY THIS FILE IS NOT A LIST OF TABLES ───────────────────────────────────
 * A hardcoded list of table names standing in for a derivation is this estate's
 * recurring bug, and it is exactly the bug this check exists to catch: what
 * nobody enumerated. So the candidate set is DERIVED at runtime from the live
 * catalogue (derive.cjs) — every composite unique index in `public`, every way of
 * dropping one of its columns to leave a group key and a discriminator, on any
 * table that carries authored text. This file supplies only the one thing a
 * catalogue cannot state: whether siblings under that key are MEANT to differ.
 *
 * A candidate the register does not name is reported UNKNOWN, never skipped and
 * never assumed either way — so a new variant-bearing table shows up in the
 * report the first night it exists, as an unanswered question rather than as
 * silence. Coercing an unknown into a verdict is the failure mode here.
 *
 * ── AND WHY IT IS NOT ABOUT GLOBAL UNIQUENESS ───────────────────────────────
 * #264 found three duplicate-text pairs and only two were defects; the third was
 * natural reuse of a stock phrase ACROSS scenes, which is fine and always will
 * be. The assertion is about siblings under ONE key. A check that cried wolf
 * about global repetition would be switched off inside a week, and a check
 * nobody trusts is worse than no check.
 */
'use strict';

const MUST_DIFFER = 'MUST_DIFFER';
const MAY_REPEAT = 'MAY_REPEAT';
const UNKNOWN = 'UNKNOWN';
const OUT_OF_SCOPE = 'OUT_OF_SCOPE';

/** The register key: what identifies one sibling shape. */
function candidateKey(c) {
  return `${c.table}::${[...c.groupCols].sort().join(',')}::${c.discriminator}`;
}

/**
 * Verdicts, each citing the live code or the live constraint that decides it.
 * `fields` is a list of assertions: each entry is the tuple of columns that must
 * not be byte-identical between two siblings. One entry per independently
 * authored artefact — a pod sentence's English and its target are authored by
 * different people at different times, so they are two assertions, not one.
 */
const REGISTER = {
  // ── The flow variants. A FLOW IS A variant_key (Tom's ruling, 2026-09-01,
  // quoted in tools/pods/parse-sector-walk.cjs): one scene, several flows, each
  // flow a full 1..N run of sentence_number. Two flows that say the same thing at
  // the same position are one flow written twice.
  'canonical_pod_scenarios::pod_slug,scene_number,sentence_number::variant_key': {
    verdict: MUST_DIFFER,
    fields: [['english_text'], ['target_text']],
    why: 'A flow is a variant_key (tools/pods/parse-sector-walk.cjs header, Tom 2026-09-01). Sibling flows exist to offer different turns at the same position.',
  },
  'listening_pod_sentences::pod_id,scene_number,sentence_number::variant_key': {
    verdict: MUST_DIFFER,
    fields: [['target_text'], ['known_text']],
    why: 'The served copy of the same flow-variant shape as canonical_pod_scenarios; the unique constraint listening_pod_sentences_pod_scene_sent_variant_key is what makes two rows siblings.',
  },

  // ── Practice phrases. Two phrases under one LEGO at two positions are two
  // separate drill items; byte-identical ones drill the learner on the same item
  // twice inside one round. Roles are kept apart on purpose: a `component` row is
  // a per-sentence tiling gloss and may legitimately equal a `build` row's text.
  'course_practice_phrases::course_code,lego_index,seed_number::position': {
    verdict: MUST_DIFFER,
    fields: [['known_text', 'target_text']],
    alsoGroupBy: ['phrase_role'],
    where: "phrase_role is distinct from 'component'",
    why: 'Positions under one LEGO are separate drill items. COMPONENT rows are excluded: they are per-sentence literal tiling slices, and a sentence containing the same little word twice is tiled by it twice — the course_legos tiling argument, and 9 of the 9 target_phrases hits before the exclusion were exactly that ("to", "the", "do"). (services/course-builder — phrase IDs are assigned per position). The pair is asserted, not each side: one target reached by two different knowns is reception, which ZUT permits.',
  },
  'target_phrases::lego_index,seed_number,target_lang::position': {
    verdict: MUST_DIFFER,
    fields: [['target_text']],
    alsoGroupBy: ['phrase_role'],
    where: "phrase_role is distinct from 'component'",
    why: 'The canonical target-side mirror of course_practice_phrases, read by services/course-builder/routes/seed-translate.cjs. Same shape, target side only — the table has no known_text.',
  },

  // ── Shapes that legitimately repeat, each with the reason it does. These are
  // the wolf-cries this check must NOT make.
  'course_legos::course_code,seed_number::lego_index': {
    verdict: MAY_REPEAT,
    fields: [],
    why: 'LEGOs TILE one seed sentence; a sentence that contains the same chunk twice is tiled by the same chunk twice. lego_index is a position in a tiling, not a variant discriminator.',
  },
  'target_legos::seed_number,target_lang::lego_index': {
    verdict: MAY_REPEAT,
    fields: [],
    why: 'Same tiling argument as course_legos, on the canonical target side.',
  },
  'course_gender_expansions::course_code,original_text::text_side': {
    verdict: MAY_REPEAT,
    fields: [],
    why: 'The known side and the target side of one expansion routinely agree. The f=m case that WOULD matter is already defended: validation.cjs loadGenderVariantLicence skips a pair whose two readings normalise equal, so such a row licenses nothing.',
  },
  'course_gender_expansions::course_code,original_text::language': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Two languages carrying the same expansion of the same text is a coincidence of spelling, not a variant collision.',
  },
  'audio_clips::language,role,text_key::voice_id': {
    verdict: MAY_REPEAT,
    fields: [],
    why: 'Two voices saying the SAME text is the entire point of a take set; the text is part of the identity key, so siblings here are meant to agree, not differ.',
  },
  'course_audio::course_code,language,role,text_normalized::voice_id': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Same as audio_clips: the text is in the key. Sibling takes must agree on text and differ only in voice.',
  },
  'target_audio::role,target_lang,text_normalized::voice_id': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Same as audio_clips.',
  },
  'shared_audio::language,text_normalized::audio_type': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Same as audio_clips: the text is in the key.',
  },
  'apml_documents::document_path::version': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Versions are a HISTORY, not a variant set. Two successive versions that happen to carry the same title are not a defect.',
  },
  'phase_prompts::phase_code::version': {
    verdict: MAY_REPEAT, fields: [], why: 'A version history, as apml_documents.',
  },
  'language_briefs::known_code,target_code::version': {
    verdict: MAY_REPEAT, fields: [], why: 'A version history, as apml_documents.',
  },
  'canonical_seed_translations::seed_number::language_code': {
    verdict: MAY_REPEAT, fields: [],
    why: 'One translation per language; two languages translating a seed identically (cognates, shared orthography) is a fact about the languages.',
  },
  'target_seed_texts::seed_number::target_lang': {
    verdict: MAY_REPEAT, fields: [], why: 'As canonical_seed_translations.',
  },
  'course_seeds::seed_number::course_code': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Two courses sharing a seed number is the shared canonical corpus doing its job. Duplicate seeds WITHIN one course are a real defect but a different one — global uniqueness, not sibling variance — and are out of this check\'s scope by design.',
  },
  'course_seed_drafts::seed_number::course_code': {
    verdict: MAY_REPEAT, fields: [], why: 'As course_seeds.',
  },
  'listening_pods::course_code::slug': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Two pods of one course may carry the same human title; the slug is the identity and it already differs.',
  },
  'pod_legos::course_code::lego_key': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Two lego_keys of one course resolving to the same target string is ordinary vocabulary overlap between pods.',
  },
  'voice_language_roles::gender,language,slot::rank': {
    verdict: MAY_REPEAT, fields: [],
    why: 'Ranks are a fallback ladder and carry no authored text; that the SAME VOICE must not appear twice is already a constraint (voice_language_roles_no_self_backup), so nothing here is unguarded.',
  },
  'documentation_sections::document_id::section_key': {
    verdict: MAY_REPEAT, fields: [], why: 'Two sections of one document may share a title; the section_key is the identity.',
  },
  'course_qa_flags::phrase_id::check_type': {
    verdict: MAY_REPEAT, fields: [], why: 'Flags of different kinds on one phrase; resolution_notes is a human note, not a variant.',
  },
  'sample_flags::audio_uuid::course_code': {
    verdict: MAY_REPEAT, fields: [], why: 'Flag notes, not authored content.',
  },
  'daily_contributions::target_language::contribution_date': {
    verdict: MAY_REPEAT, fields: [], why: 'Counters, not content.',
  },
  'language_pair_briefs::known_code::target_code': {
    verdict: MAY_REPEAT, fields: [], why: 'One brief per pair; the codes are the key, not content that varies.',
  },

  // ── Never touched. Learner progress is not content and this check never reads
  // a learner row for content comparison.
  'learner_milestones::course_id,learner_id::milestone_type': {
    verdict: OUT_OF_SCOPE, fields: [], why: 'Learner progress. Never touched, never compared.',
  },
  'coach_goals::subscriber_id::week_index': {
    verdict: OUT_OF_SCOPE, fields: [], why: 'Learner-side coaching state, not authored course content.',
  },
};

/**
 * THE SCOPE RULE — cross-scope reuse is legitimate, and saying so is the whole
 * difference between this check and a global-uniqueness check nobody trusts.
 *
 * When the discriminator is the column naming WHICH course / pod / language /
 * learner / document a row belongs to, the two "siblings" are the same item
 * living in two scopes, and identical content between them is REUSE. That is
 * precisely #264's third pair — a stock phrase reused across scenes, correctly
 * left alone. The rule is stated by column semantics and applied uniformly, so
 * it cannot quietly become a table list.
 */
const SCOPE_COLUMN_RE = /(^|_)(code|id|uuid|slug|lang|language|path|role|owner)$/;

/**
 * THE ORDINAL RULE — a position in a document is not a variant of another position.
 *
 * When the discriminator is an ordinal (global_order, scene_number, sentence_number,
 * seed_number, lego_index…), the two rows are different items in one document or
 * one course, not two renderings of one item. Identical content at two positions is
 * repetition ACROSS the document — #264's third pair, correctly left alone.
 *
 * A table where positions genuinely ARE variants must be registered explicitly and
 * the register wins: course_practice_phrases.position is exactly that case. This
 * rule is reported as a rule, not as a ruling, so it can be challenged per table.
 */
const ORDINAL_COLUMN_RE = /(^|_)(order|number|index|position)$/;

/** Text columns that are operator notes rather than authored learner-facing content. */
const NOTE_COLUMN_RE = /(^|_)(note|notes|reviewer_notes|resolution_notes)$/;

/**
 * Classify one derived candidate. A candidate no rule and no register entry
 * names comes back UNKNOWN — reported, never asserted, never assumed clean.
 */
function classify(candidate) {
  const key = candidateKey(candidate);
  const hit = REGISTER[key];
  if (hit) return { key, by: 'register', ...hit };
  if (/^learner_|_progress$/.test(candidate.table)) {
    return { key, verdict: OUT_OF_SCOPE, fields: [], by: 'rule:learner', why: 'Learner progress table — never read for content, never touched.' };
  }
  if (SCOPE_COLUMN_RE.test(candidate.discriminator)) {
    return {
      key, verdict: MAY_REPEAT, fields: [], by: 'rule:scope',
      why: `Cross-scope: siblings here differ only by \`${candidate.discriminator}\`, so identical content is one item reused in two scopes — legitimate (the scope rule).`,
    };
  }
  const authored = (candidate.contentCols || []).filter((c) => !NOTE_COLUMN_RE.test(c));
  if (!authored.length) {
    return {
      key, verdict: MAY_REPEAT, fields: [], by: 'rule:no-content',
      why: 'The table carries no authored learner-facing text — only operator notes — so there is nothing here that a sibling could be identical to.',
    };
  }
  if (ORDINAL_COLUMN_RE.test(candidate.discriminator)) {
    return {
      key, verdict: MAY_REPEAT, fields: [], by: 'rule:ordinal',
      why: `Ordinal: \`${candidate.discriminator}\` is a position in a document or a course, so two rows here are different items and identical content between them is repetition across the document, not a variant collision (the ordinal rule).`,
    };
  }
  return {
    key,
    verdict: UNKNOWN,
    fields: [],
    by: 'default',
    why: 'No ruling: live code does not say whether siblings under this key are meant to differ. Reported so somebody can decide; asserting either way would be a guess.',
  };
}

module.exports = { REGISTER, classify, candidateKey, SCOPE_COLUMN_RE, ORDINAL_COLUMN_RE, NOTE_COLUMN_RE, MUST_DIFFER, MAY_REPEAT, UNKNOWN, OUT_OF_SCOPE };
