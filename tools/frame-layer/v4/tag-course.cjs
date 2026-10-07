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

async function tagCourse(course, data, { parallel = +(process.env.FRAME_TAG_PARALLEL || 4), log } = {}) {
  const texts = [...data.seeds, ...data.legos, ...(data.components || []), ...(data.phrases || [])]
    .map(r => String(r.known_text || '').trim()).filter(Boolean);
  return T.ensureTagged(texts, { knownLanguage: T.knownLanguageName(course), parallel, ...(log ? { log } : {}) });
}

module.exports = { tagCourse };
