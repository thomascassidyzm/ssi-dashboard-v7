/**
 * BASKET LAB IS ADMIN-ONLY (Tom, 2026-09-25: "Lock it, shouldn't be public").
 *
 * The lab is mounted on production-api at /api/basket-lab, which Tailscale
 * Funnel puts on the public internet, and it answered anyone. It is locked
 * with the SAME admin check every other admin route uses (production-api's
 * requireAdmin, via the control-plane shape: same-host callers pass, everyone
 * else must be an admin).
 *
 * One wrinkle forces a second door, not a second check: the dashboard shows
 * the lab in an <iframe>, and a frame cannot send an Authorization header. So
 * an admin-authenticated call (POST /api/basket-lab-ticket, requireAdmin)
 * mints a 60-second ticket; the frame opens /api/basket-lab/enter?t=<ticket>,
 * which trades it for an HttpOnly cookie scoped to /api/basket-lab (12h,
 * signed with a per-process key — a restart just means the page mints a new
 * one). Partitioned, so it works inside the popty.app frame on browsers that
 * block third-party cookies. The admin decision is still requireAdmin's; the
 * cookie only carries it into the frame.
 */

const crypto = require('crypto')

const COOKIE = 'bl_session'
const TICKET_MS = 60 * 1000
const SESSION_MS = 12 * 60 * 60 * 1000

function createBasketLabGate({ isLoopbackDirect, requireAdmin, base = '/api/basket-lab', key = crypto.randomBytes(32), now = () => Date.now() }) {
  if (typeof isLoopbackDirect !== 'function' || typeof requireAdmin !== 'function') {
    throw new Error('createBasketLabGate needs isLoopbackDirect and requireAdmin')
  }
  const sign = (kind, exp, who) => crypto.createHmac('sha256', key).update(`${kind}|${exp}|${who}`).digest('base64url')
  const token = (kind, ms, who) => {
    const exp = now() + ms
    const w = Buffer.from(String(who || 'admin')).toString('base64url')
    return `${exp}.${w}.${sign(kind, exp, w)}`
  }
  const verify = (kind, t) => {
    const [exp, w, sig] = String(t || '').split('.')
    if (!exp || !w || !sig || !(Number(exp) > now())) return null
    const want = Buffer.from(sign(kind, exp, w))
    const got = Buffer.from(sig)
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null
    return Buffer.from(w, 'base64url').toString()
  }
  const cookieOf = (req) => {
    const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
    return m ? m[1] : null
  }
  const refuse = (res) => {
    res.status(401).type('text/plain').send('Basket Lab is for signed-in Popty admins. Open it from Admin → Labs → Basket Lab.\n')
  }

  /** POST /api/basket-lab-ticket — requireAdmin decides; answers { ticket }. */
  async function mintTicket(req, res) {
    const user = await requireAdmin(req, res)
    if (!user) return
    res.json({ ticket: token('ticket', TICKET_MS, user.email || user.id) })
  }

  /** Mounted in front of the lab at `base`. */
  async function gate(req, res, next) {
    try {
      // app.use strips the mount path, so req.path is the lab-relative path.
      if (req.path === '/enter') {
        const who = verify('ticket', req.query.t)
        if (!who) return refuse(res)
        const next_ = String(req.query.next || '/lab')
        const dest = next_.startsWith('/lab') ? `${base}${next_}` : `${base}/lab`
        res.setHeader('Set-Cookie', `${COOKIE}=${token('session', SESSION_MS, who)}; Path=${base}; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=None; Partitioned`)
        return res.redirect(302, dest)
      }
      if (isLoopbackDirect(req)) return next()
      if (verify('session', cookieOf(req))) return next()
      if (!req.headers.authorization) return refuse(res)
      const user = await requireAdmin(req, res)
      if (!user) return
      req.dashboardUser = user
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Basket Lab access check failed' })
    }
  }

  return { gate, mintTicket }
}

module.exports = { createBasketLabGate, COOKIE }
