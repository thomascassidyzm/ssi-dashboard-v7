/**
 * RECORDED TAG FIXTURES for the frame-layer tests that exercise many texts
 * across several codexes (could-occupy, derive-and-baskets, declaration,
 * instantiability). Tests never call a model: each such test calls
 * `installFixture('<name>')`, which installs fixtures/<name>.tags.json as the
 * tag cache for every codex (P, D, X, C, S-spa) via tag-fixtures' installTags.
 *
 * The fixture IS the statement of what the test assumes: the tags a
 * Haiku-family model gave those exact texts under the named codex versions,
 * read and kept because they are right per the codex. When a codex version
 * changes, re-record and READ the diff before committing it:
 *
 *   FRAME_TAG_RECORD=1 node tools/frame-layer/<test>.test.cjs   # collects texts (repeat until nothing new)
 *   node tools/frame-layer/fixture-tags.cjs <name>              # tags them with Haiku into the fixture
 *
 * Recording mode answers every lookup with the fixture's tag when it has one
 * and an empty tag otherwise, and writes the texts it lacked to
 * fixtures/<name>.todo.json on exit. Several passes may be needed, because
 * a frame recorded in pass 1 can open a code path that reads new texts.
 */
const fs = require('fs');
const path = require('path');
const T = require('./frame-tagger.cjs');
const { installTags } = require('./tag-fixtures.cjs');

const CODEXES = {
  P: T.CODEX,
  D: require('./dialogue-codex.json'),
  X: require('./exchange-codex.json'),
  C: require('./could-occupy-codex.json'),
  'S-spa': require('./split-codex-spa.json'),
};
const LANG = { P: 'English', D: 'English', X: 'English', C: 'English', 'S-spa': 'Spanish' };
const DIR = path.join(__dirname, 'fixtures');
const fileOf = (name, ext) => path.join(DIR, `${name}.${ext}.json`);
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

class RecordingCache {
  constructor(tags, missing) { this.inner = new T.MemoryCache(tags); this.missing = missing; }
  has() { return true; }
  get(text) {
    const t = this.inner.get(text);
    if (t) return t;
    this.missing.add(String(text).trim());
    return { frames: [], opener: false };
  }
  put() {}
}

function installFixture(name) {
  const fx = read(fileOf(name, 'tags')) || { versions: {}, tags: {} };
  if (process.env.FRAME_TAG_RECORD === '1') {
    const missing = Object.fromEntries(Object.keys(CODEXES).map(id => [id, new Set()]));
    for (const [id, codex] of Object.entries(CODEXES)) T.useCache(new RecordingCache((fx.tags || {})[id] || {}, missing[id]), codex);
    process.on('exit', () => {
      const todo = Object.fromEntries(Object.entries(missing).map(([id, s]) => [id, [...s].filter(Boolean)]));
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(fileOf(name, 'todo'), JSON.stringify(todo, null, 1) + '\n');
      process.stderr.write(`fixture ${name}: ${Object.values(todo).reduce((a, x) => a + x.length, 0)} untagged text(s) written to ${name}.todo.json\n`);
    });
    require('./tag-fixtures.cjs').installCuts(fx.cuts || {});
    return;
  }
  // `versions` is provenance, not a gate: the tags are the test's stated
  // assumptions and stay valid input for the code under test whatever the
  // codex says today. Whether the MODEL still agrees is the gold set's job.
  for (const [id, codex] of Object.entries(CODEXES)) installTags((fx.tags || {})[id] || {}, codex);
  // clause cuts (clause-cut.cjs): { text: number of the connective opening the second clause, 0 = none }
  require('./tag-fixtures.cjs').installCuts(fx.cuts || {});
}

/** Tag a fixture's todo list with Haiku and fold it into the fixture. Costs model calls; never run by a test. */
async function record(name) {
  const todo = read(fileOf(name, 'todo'));
  if (!todo) throw new Error(`no ${name}.todo.json: run the test with FRAME_TAG_RECORD=1 first`);
  const fx = read(fileOf(name, 'tags')) || { versions: {}, tags: {} };
  for (const [id, texts] of Object.entries(todo)) {
    if (!texts.length) continue;
    const codex = CODEXES[id];
    const cache = new T.MemoryCache();
    await T.ensureTagged(texts, { codex, cache, knownLanguage: LANG[id] });
    fx.tags[id] = fx.tags[id] || {};
    for (const t of texts) {
      const tag = cache.get(t);
      if (!tag) throw new Error(`model left "${t}" untagged`);
      fx.tags[id][t] = id === 'P' ? { frames: tag.frames, opener: tag.opener } : tag.frames;
    }
  }
  for (const id of Object.keys(CODEXES)) if (fx.tags[id]) fx.versions[id] = CODEXES[id].version;
  fs.writeFileSync(fileOf(name, 'tags'), JSON.stringify(fx, null, 1) + '\n');
  fs.unlinkSync(fileOf(name, 'todo'));
}

module.exports = { installFixture, record, CODEXES };

if (require.main === module) record(process.argv[2]).catch(e => { console.error(e.message); process.exit(1); });
