/**
 * The labs moved from /admin/configs/* to /admin/labs/* on 2026-09-01, because a
 * lab is not a kind of config. Bookmarks, six months of links in reports and
 * chat, and the playwright specs all pointed at the old paths.
 *
 * The redirects live in their own module for one reason: so a test can assert
 * that every old path still resolves, without booting the router and its
 * twenty eagerly-imported views. A moved path with no redirect is a 404 that
 * only shows up when someone clicks an old link, which is the worst possible
 * time to find out.
 *
 * ADDING A LAB? Nothing to do here. This table only covers the move.
 */
export const LEGACY_LAB_REDIRECTS = [
  { path: '/admin/configs', redirect: '/admin/labs' },
  { path: '/admin/configs/listening', redirect: '/admin/labs/listening' },
  { path: '/admin/configs/speaking', redirect: '/admin/labs/speaking' },
  { path: '/admin/configs/pods', redirect: '/admin/labs/pods' },
  { path: '/admin/configs/voice', redirect: '/admin/labs/voice' },
  { path: '/admin/configs/vad', redirect: '/admin/labs/vad' },
  { path: '/admin/configs/basket', redirect: '/admin/labs/basket' },
  // Capture A/B was never under /admin/configs — it was under /admin directly,
  // and linked from nowhere in src/. It joins the labs and keeps its old path.
  { path: '/admin/capture-ab', redirect: '/admin/labs/capture-ab' },
  // The old single Listening page lived here, two moves ago.
  { path: '/admin/listening', redirect: '/admin/labs/listening' },
]
