/**
 * TAG A COURSE: every known text the frame layer reads for one course — seed
 * sentences, LEGOs, components, BUILD/USE phrases — classified by the frame
 * tagger (Haiku reading frame-codex.json) and cached per text. Course-agnostic:
 * the known language comes from the course code (…_for_hin → Hindi), and a
 * text already tagged for any course costs nothing again.
 *
 * Call this (await) before any sync scorer: frame-inventory, window-coverage,
 * availability.attestedFrames all read the cache and throw on a cold text.
 */
const T = require('../frame-tagger.cjs');

// FRAME_TAG_BATCH=100 for estate runs: gold F1 held (0.92/0.97 on two runs) at ~half the tokens per text of batch 40.
async function tagCourse(course, data, { parallel = +(process.env.FRAME_TAG_PARALLEL || 4), batch = +(process.env.FRAME_TAG_BATCH || 40), log } = {}) {
  const texts = [...data.seeds, ...data.legos, ...(data.components || []), ...(data.phrases || [])]
    .map(r => String(r.known_text || '').trim()).filter(Boolean);
  return T.ensureTagged(texts, { knownLanguage: T.knownLanguageName(course), parallel, batch, ...(log ? { log } : {}) });
}

module.exports = { tagCourse };
