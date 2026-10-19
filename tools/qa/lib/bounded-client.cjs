'use strict';

// One backend transaction per statement: works through transaction-mode poolers.
// Serialise concurrent callers so their BEGIN/COMMIT pairs cannot interleave.
function boundedClient(client, name, { readOnly = true } = {}) {
  let tail = Promise.resolve();
  const raw = client.query.bind(client);
  const query = (text, values) => {
    const run = async () => {
      const started = Date.now();
      await raw(readOnly ? 'BEGIN READ ONLY' : 'BEGIN');
      try {
        await raw("SELECT set_config('application_name', $1, true), set_config('statement_timeout', '5000', true), set_config('lock_timeout', '1000', true)", [name]);
        const result = await raw(text, values);
        await raw('COMMIT');
        console.error(`${name} statement_ms=${Date.now() - started}`);
        return result;
      } catch (e) {
        await raw('ROLLBACK').catch(() => {});
        throw e;
      }
    };
    const pending = tail.then(run);
    tail = pending.catch(() => {});
    return pending;
  };
  return { query, end: (...args) => client.end(...args) };
}
module.exports = { boundedClient };
