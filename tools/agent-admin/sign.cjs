#!/usr/bin/env node
// The half of the agent-admin door that can read the key (job #410). Run ONLY as
// the key's owner:  sudo -n -u popty node tools/agent-admin/sign.cjs
// stdin  {"agentId","method","path","body"}   stdout  the x-agent-admin header value.
// It signs; it never prints the key, and it refuses an unnamed agent.
'use strict';
const { signHeader, loadKey } = require('../../services/shared/agent-admin-identity.cjs');

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  try {
    const { agentId, method, path, body } = JSON.parse(raw);
    const key = loadKey(process.env.POPTY_AGENT_ADMIN_KEY_FILE || '/etc/popty/agent-admin.key');
    process.stdout.write(signHeader({ secret: key.secret, agentId, method, path, body }));
  } catch (e) {
    process.stderr.write(`sign refused: ${e.message}\n`);
    process.exit(2);
  }
});
