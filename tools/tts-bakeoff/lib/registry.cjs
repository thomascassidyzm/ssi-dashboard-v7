/** Adapter registry. One entry per provider; order is report order. */
const IDS = ['cartesia', 'chatterbox', 'minimax', 'openai', 'azure', 'elevenlabs'];

function load(id) {
  if (!IDS.includes(id)) {
    throw new Error(`unknown provider "${id}" — known: ${IDS.join(', ')}`);
  }
  return require(`../adapters/${id}.cjs`);
}

function all() {
  return IDS.map(load);
}

module.exports = { IDS, load, all };
