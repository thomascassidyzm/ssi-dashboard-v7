// services/shared/agent-read-identity.cjs
//
// THE READ-ONLY AGENT DOOR (job #748, Tom 2026-10-15: "we can't be building a system that has so
// many restrictions that we can't use it").
//
// HARM it answers: job #739 (Aran clone check) was refused "Authentication required" on the voice
// catalogue — a read that spends nothing and writes nothing — because every /api/voicelab GET wants
// a signed-in dashboard session, and the signed agent key (agent-admin-identity.cjs) carries
// admin:all only for Kai's key. So an agent could RENDER audio through POST /api/audio/render on
// nothing but an x-agent-id header, yet could not READ which voices exist.
//
// The door: a GET that arrives on loopback with no forwarded headers (so never off the funnel)
// and names itself with a well-formed x-agent-id is admitted as an attributed, read-only agent.
// Routes opt in one by one (voicelab's spend-free catalogue reads); nothing that writes or spends
// is reachable through it, because the identity is refused for any method but GET/HEAD.
// Every admission is logged with the agent id.
//
// SUNSET: retire when agents hold a signed read scope by default (agent-admin-identity.cjs).

'use strict';

const AGENT_ID = /^[a-z0-9][a-z0-9_.:-]{1,63}$/i;

function loopbackDirect(req) {
  const addr = (req.socket && req.socket.remoteAddress) || '';
  const loop = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  return loop && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip'];
}

/** The read-only agent user for this request, else null. Never writes a response. */
function agentReader(req, { logger = console } = {}) {
  if (!req || !req.headers) return null;
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  const id = String(req.headers['x-agent-id'] || req.headers['x-service-name'] || '').trim();
  if (!id || !AGENT_ID.test(id)) return null;
  if (!loopbackDirect(req)) return null;
  logger.info?.(`[AgentRead] ${id} ${req.method} ${req.originalUrl || req.url}`);
  return { kind: 'agent', id, email: `agent:${id}`, name: `agent ${id}`, role: 'agent-read', courses: [], readOnly: true, viaAgentRead: true };
}

module.exports = { agentReader, loopbackDirect, AGENT_ID };
