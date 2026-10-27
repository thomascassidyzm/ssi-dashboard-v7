// Which live rows still say the OLD words of an edited line (so its old take is not an orphan)?
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
const C = { north: 'cym_nv2_for_eng', south: 'cym_sv2_for_eng' };
for (const [f, ids] of [['north', ['S1130L02U07', 'S1495L02U03']], ['south', ['S0319L02B06']]]) {
  const live = require(process.env.HOME + `/.tmpbig/ph157-${C[f]}.json`);
  for (const id of ids) {
    const o = require(`./${f}-batch.json`).ops.find((o) => o.phrase_id.endsWith(id));
    const old = normalizeForAudio(o.expect.target_text);
    console.log(id, '| old:', o.expect.target_text, '| still live on:', live.filter((p) => normalizeForAudio(p.target_text) === old).map((p) => p.id).slice(0, 5));
  }
}
