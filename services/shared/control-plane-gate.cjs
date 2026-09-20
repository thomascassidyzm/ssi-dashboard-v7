/**
 * THE CONTROL PLANE IS ON THE PUBLIC INTERNET, SO IT IS GATED.
 *
 * production-api listens on 127.0.0.1:3470 and Tailscale Funnel proxies
 * https://<host>.ts.net:8443 to it. Funnel is public internet exposure, not
 * tailnet-only: on 2026-09-20 an anonymous request from off-tailnet reached
 * GET /api/deploy/history and got 200. The routes this gate covers do not
 * return data — they deploy code, restart pm2 processes, kill agent processes
 * and read host telemetry.
 *
 * Same-host callers (the service mesh, agents spawned on the box, phase8)
 * arrive on bare loopback with no forwarding headers and keep working
 * untouched. Everything arriving through the funnel carries
 * `X-Forwarded-For` (observed verbatim: `Tailscale-Funnel-Request: ?1`,
 * `X-Forwarded-For: <public client ip>`), so it can never look same-host, and
 * must present an admin identity.
 *
 * `requireAdmin` writes its own 401/403 and returns null on refusal — this
 * gate simply stops when it does.
 */
function createControlPlaneGate({ isLoopbackDirect, requireAdmin }) {
  if (typeof isLoopbackDirect !== 'function' || typeof requireAdmin !== 'function') {
    throw new Error('createControlPlaneGate needs isLoopbackDirect and requireAdmin')
  }
  return async function controlPlaneGate(req, res, next) {
    try {
      if (isLoopbackDirect(req)) return next()
      const user = await requireAdmin(req, res)
      if (!user) return
      req.dashboardUser = user
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Control plane access check failed' })
    }
  }
}

/**
 * Loopback-ONLY: routes whose whole purpose is same-host service-mesh chatter
 * (`/api/production/internal/emit`). No browser calls them; every caller in
 * the repo is a localhost fetch.
 */
function loopbackOnly(isLoopbackDirect) {
  return function loopbackOnlyGate(req, res, next) {
    if (isLoopbackDirect(req)) return next()
    return res.status(403).json({ error: 'Internal route — same-host callers only' })
  }
}

module.exports = { createControlPlaneGate, loopbackOnly }
