#!/usr/bin/env node
// The half of the agent-admin door that can read the key (job #410). Run ONLY as
// the key's owner:  sudo -n -u popty node tools/agent-admin/sign.cjs
// stdin  {"agentId","method","path","body","key"?}   key = a named extra key (e.g. "kai" -> agent-admin-kai.key)
//    stdout  the x-agent-admin header value.
// It signs; it never prints the key, and it refuses an unnamed agent.
'use strict';
const { signHeader, loadKey, keyFileFor } = require('../../services/shared/agent-admin-identity.cjs');

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  try {
    const { agentId, method, path, body, key: keyName } = JSON.parse(raw);
    const key = loadKey(keyFileFor(keyName));
    if (key.agentIdPrefix && agentId !== key.agentIdPrefix && !String(agentId).startsWith(key.agentIdPrefix + '-')) throw new Error(`this key signs only agent ids starting ${key.agentIdPrefix}-`);
    process.stdout.write(signHeader({ secret: key.secret, agentId, method, path, body }));
  } catch (e) {
    process.stderr.write(`sign refused: ${e.message}\n`);
    process.exit(2);
  }
});
