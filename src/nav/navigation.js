// ONE DECLARATION OF THE NAVIGATION (2026-09-04).
//
// Popty's navigation used to be derived in three places that had nothing
// comparing them: the primary tabs and sub-tab row in AppNavbar.vue, the hub
// cards in Admin.vue, and a hand-written `isAdminSection` computed that decided
// which primary tab lit up. Three defects in one hour on 2026-09-03 were all
// the same shape — two things that must agree, kept in step by convention:
//   * the admin sub-tab row and the admin hub cards listed different pages;
//   * `/builds` was in the sub-tab row but not in `isAdminSection`, so landing
//     there un-highlighted Admin and the whole row vanished underneath you.
//
// So: sections, their routes and their destinations are declared HERE, once,
// and every surface is derived from this file. Adding a page is one entry and
// cannot be half-done. `navigation.guard.test.js` fails if a route exists that
// this file does not account for, or if the two rendered surfaces could
// disagree, which is what stops this decaying back into convention.
//
// This module is plain JS on purpose — no Vue, no router import — so the guard
// test can read it directly.

// ---------------------------------------------------------------------------
// Matchers. A pattern is one of:
//   '/insights'   exact path
//   '/admin*'     path prefix ('/admin' itself included)
//   '@RouteName'  route name
// ---------------------------------------------------------------------------
export function matches(pattern, route) {
  if (!pattern) return false
  if (pattern.startsWith('@')) return route.name === pattern.slice(1)
  if (pattern.endsWith('*')) {
    const head = pattern.slice(0, -1)
    return route.path === head.replace(/\/$/, '') || route.path.startsWith(head)
  }
  return route.path === pattern
}

export function matchesAny(patterns, route) {
  return (patterns || []).some((p) => matches(p, route))
}

// ---------------------------------------------------------------------------
// PRIMARY TABS — the persistent top row, visible everywhere.
// A tab is active when any section that declares it as its primary is active,
// which is what makes '/builds' (an admin destination) light up Admin.
// ---------------------------------------------------------------------------
export const PRIMARY_TABS = [
  { id: 'courses', label: 'Courses', to: '/courses' },
  { id: 'pedagogy', label: 'Pedagogy', to: '/pedagogy' },
  { id: 'admin', label: 'Admin', to: '/admin' }
]

// ---------------------------------------------------------------------------
// SECTIONS — ordered; the FIRST section that claims the current route owns the
// sub-tab row. `owns` is also the route-coverage claim the guard test checks,
// so a route inside a section's prefix can never be a page the nav has not
// heard of.
//
// `items` are that section's destinations. An item with a `hub` block is also
// rendered as a card on that section's hub page (currently only /admin has
// one), so the row and the cards CANNOT list different pages: they are one
// list read twice.
// ---------------------------------------------------------------------------
export const SECTIONS = [
  {
    // Stock-take — the compiled reference. Its own row, but it is reached from
    // Admin, so the Admin primary tab stays lit while you are in it.
    id: 'stocktake',
    primary: 'admin',
    owns: ['/stocktake*'],
    items: [
      { label: 'Stock-take', to: '/stocktake', match: ['@StocktakeIndex'] },
      { label: 'Pipeline', to: '/stocktake/pipeline', match: ['@DocsPipeline'] },
      { label: 'Glossary', to: '/stocktake/glossary', match: ['@DocsGlossary'] },
      { label: 'APML', to: '/stocktake/apml', match: ['@DocsApml'] }
    ]
  },
  {
    // Admin — platform-wide tooling. Every entry here is a sub-tab AND a hub
    // card, except the hub itself.
    id: 'admin',
    primary: 'admin',
    hubPath: '/admin',
    // Only the prefixes no item declares. Every item's own `to` is owned
    // automatically (see ownsOf), so a new destination is ONE entry — it
    // cannot be a tab the section has never heard of, which is what /builds
    // was until it was hand-patched into four separate places.
    owns: ['/admin*'],
    items: [
      {
        label: 'Admin',
        to: '/admin',
        isHubSelf: true // the hub page's own tab; a card pointing at itself would be a loop
      },
      {
        // Labs, not Configs (2026-09-01). The six surfaces here were never
        // configs — three of them write nothing at all.
        label: 'Labs',
        to: '/admin/labs',
        match: ['/admin/labs*', '/admin/configs*', '/admin/listening*'],
        hub: {
          badge: 'eight',
          description: 'Every lab in one place — Listening, Speaking, Voice, Pod, Script, VAD, Basket and Capture A/B — grouped by blast radius: who a change reaches, and when.',
          action: 'Open Labs',
          accent: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>'
        }
      },
      {
        label: 'Insights',
        to: '/insights',
        hub: {
          badge: 'analytics',
          description: 'Cross-course insight boards — lifecycle, rate, coverage, content, and ops signals.',
          action: 'View Insights',
          accent: '#10b981',
          glow: 'rgba(16, 185, 129, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>'
        }
      },
      {
        label: 'Activity',
        to: '/jobs',
        badgeKey: 'activeCourses',
        hub: {
          badge: 'live',
          description: 'Running and recent jobs across the production pipeline — what is building right now.',
          action: 'View Activity',
          accent: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
        }
      },
      {
        label: 'Maintenance',
        to: '/maintenance',
        badgeKey: 'auditStale',
        hub: {
          badge: 'ops',
          description: 'Housekeeping and health — audit log, archive, and platform upkeep.',
          action: 'Open Maintenance',
          accent: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
        }
      },
      {
        label: 'Users',
        to: '/users',
        hub: {
          badge: 'access',
          description: 'Manage dashboard accounts, recorders, roles, and invite codes.',
          action: 'Manage Users',
          accent: '#14b8a6',
          glow: 'rgba(20, 184, 166, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        }
      },
      {
        // Human Recording (2026-09-02). Where each recordist's /r/ link comes
        // from; it was reachable by URL only.
        label: 'Recording',
        to: '/admin/recording',
        match: ['/admin/recording*'],
        hub: {
          title: 'Human Recording',
          badge: 'voices',
          description: 'Which languages we record with people instead of TTS, how far each has got, and the link to send each recordist.',
          action: 'Open Recording',
          accent: '#ec4899',
          glow: 'rgba(236, 72, 153, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
        }
      },
      {
        // Test builds (2026-09-04). Filed by what it does, not by who you are:
        // handing someone the Android test build is an admin job.
        label: 'Test builds',
        to: '/builds',
        hub: {
          badge: 'android',
          description: 'The current Android test build, how to install it, and where it came from.',
          action: 'Open Test builds',
          accent: '#6366f1',
          glow: 'rgba(99, 102, 241, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
        }
      },
      {
        // Was a tab with no card, for the same reason in reverse. Its own
        // section takes over the row once you are inside it.
        label: 'Stock-take',
        to: '/stocktake',
        match: [],
        hub: {
          badge: 'reference',
          description: 'The compiled current-state reference — pipeline, glossary and APML, regenerated from the code.',
          action: 'Open Stock-take',
          accent: '#64748b',
          glow: 'rgba(100, 116, 139, 0.15)',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
        }
      }
    ]
  },
  {
    // A course being created — one door, the text editor.
    id: 'course-new',
    primary: 'courses',
    owns: [],
    when: (route) => route.params?.courseCode === 'new',
    items: [{ label: 'Text', to: '/production/new/text', match: ['*'] }]
  },
  {
    // ONE door per course (Tom, 2026-06-10): Overview is the hub — every
    // working surface (Text, Audio, Record Room, QA, …) is a card there.
    id: 'course',
    primary: 'courses',
    owns: ['/production*'],
    when: (route) => route.path.startsWith('/production/') && !!route.params?.courseCode,
    items: (route) => [
      {
        label: 'Overview',
        to: `/production/${route.params.courseCode}`,
        match: ['@ProductionDashboard']
      }
    ]
  },
  {
    // The courses library and the canonical data browsers, one row.
    id: 'courses',
    primary: 'courses',
    // The library, a course's own editor page, and the canonical browsers.
    owns: ['/courses*', '/course/*', '/canonical*'],
    items: [
      { label: 'Library', to: '/courses' },
      { label: 'Seeds', to: '/canonical/seeds', match: ['@CanonicalSeeds'] },
      { label: 'Content', to: '/canonical/content', match: ['@CanonicalContent'] },
      { label: 'Pods', to: '/canonical/pods', match: ['@PodsDoc'] },
      { label: 'Script Lab', to: '/canonical/scripts', match: ['@ScriptLab', '@ScriptLabScript'] },
      // The graph the scripts are walks over (Tom asked for it by name,
      // 2026-08-31); it was reachable only from a button inside the Script Lab.
      { label: 'Metagraph', to: '/canonical/metagraph', match: ['@Metagraph'] }
    ]
  },
  {
    // Pedagogy — the founder's teaching model. It was one of three pages under
    // a "How & Why" tab until Tom deprecated the other two on 2026-09-04, so
    // the survivor is the tab: one page, one primary tab, no hub in between.
    id: 'pedagogy',
    primary: 'pedagogy',
    owns: [],
    // A ROW OF ONE IS NOT A ROW. The primary tab already IS this destination,
    // so a sub-bar underneath it would only repeat itself. Declared here
    // rather than inferred from items.length, because the course sections
    // have one item each and DO want their row (it carries the crumb).
    soloTab: true,
    items: [{ label: 'Pedagogy', to: '/pedagogy', match: ['@Pedagogy'] }]
  }
]

// ---------------------------------------------------------------------------
// ROUTES DELIBERATELY OUTSIDE THE NAV. Every one carries the reason it is not
// a nav destination. The guard test fails on any route that is neither owned
// by a section nor listed here, so a new page cannot arrive unnoticed — and
// this list is the honest, single answer to "what can you only reach by URL?".
// Redirect-only routes and `meta.public` routes are exempt automatically:
// a redirect is not a destination, and the navbar is hidden on public pages.
// ---------------------------------------------------------------------------
export const OUTSIDE_NAV = [
  { path: '/', why: 'the Home hub itself — the brand link is its door' },
  { path: '/pipeline', why: 'the old pipeline board, kept reachable by URL while the nav settles' },
  { path: '/monitor', why: 'agent monitor — opened from Activity, not a top-level destination' },
  { path: '/monitor/:courseCode', why: 'agent monitor for one course — opened from Activity' },
  { path: '/network-builder', why: 'one-off builder tool, opened by URL' },
  { path: '/validate', why: 'validator entry — opened from a course surface' },
  { path: '/validate/:courseCode', why: 'validator for one course — opened from a course surface' },
  { path: '/copy', why: 'copy editor index — opened by URL by whoever is editing copy' },
  { path: '/copy/:docId', why: 'one copy doc — opened from the copy index' },
  { path: '/htw-copy', why: 'How-it-works copy editor — opened by URL' },
  { path: '/edit/introductions', why: 'introductions editor — opened from a course surface' },
  { path: '/courses/:code/progress', why: 'per-course progress — opened from the course overview' },
  { path: '/pods/scripts', why: 'pod script index — opened from the Pods browser' },
  { path: '/pods/scripts/:courseCode', why: 'pod scripts for one course — opened from the Pods browser' },
  { path: '/quality/:courseCode', why: 'quality dashboard — opened from the course overview' },
  { path: '/quality/:courseCode/seeds/:seedId', why: 'one seed review — opened from the quality dashboard' },
  { path: '/quality/:courseCode/evolution', why: 'prompt evolution — opened from the quality dashboard' },
  { path: '/quality/:courseCode/health', why: 'health report — opened from the quality dashboard' },
  { path: '/quality/:courseCode/learned-rules', why: 'learned rules — opened from the quality dashboard' },
  { path: '/recursive-upregulation', why: 'methodology explainer, linked from the Pedagogy page' },
  { path: '/audio-preview', why: 'estate audio preview entry — opened by URL' },
  { path: '/qa-gate', why: 'estate QA gate — opened by URL' },
  { path: '/my-recording', why: 'a recordist\'s own room — the navbar is hidden for recorders' },
  { path: '/record/:courseCode?', why: 'the Record Room shell — the navbar is hidden for recorders' },
  { path: '/:pathMatch(.*)*', why: 'the 404 catch-all' }
]

// ---------------------------------------------------------------------------
// Derivations. Every rendered nav surface goes through these.
// ---------------------------------------------------------------------------

/**
 * Everything a section claims: the prefixes it declares, PLUS every one of its
 * own destinations. Derived, so a destination can never be listed in a row
 * while its section disowns the route — the /builds defect by construction.
 */
export function ownsOf(section) {
  const items = typeof section.items === 'function' ? [] : section.items
  return [...(section.owns || []), ...items.map((i) => i.to)]
}

/** The section that owns the current route, or null. First match wins. */
export function sectionFor(route) {
  return SECTIONS.find((s) => (s.when ? s.when(route) : matchesAny(ownsOf(s), route))) || null
}

/** True when `primaryId`'s tab should be lit for this route. */
export function isPrimaryActive(primaryId, route) {
  const section = sectionFor(route)
  return !!section && section.primary === primaryId
}

export function primaryTabs(route) {
  return PRIMARY_TABS.map((t) => ({
    label: t.label,
    to: t.to,
    active: isPrimaryActive(t.id, route)
  }))
}

/** What lights an item up: its own declared patterns, or its destination. */
export function matchOf(item) {
  return item.match ?? [item.to]
}

function itemsOf(section, route) {
  return typeof section.items === 'function' ? section.items(route) : section.items
}

/** The sub-tab row for the current route: the owning section's items. */
export function sectionTabs(route, badges = {}) {
  const section = sectionFor(route)
  if (!section) return []
  // A section that declares itself solo renders no row: its primary tab is the
  // destination, and a one-tab bar repeating it is noise.
  if (section.soloTab) return []
  return itemsOf(section, route).map((item) => ({
    label: item.label,
    to: item.to,
    active: matchOf(item).includes('*') ? true : matchesAny(matchOf(item), route),
    badge: item.badgeKey ? badges[item.badgeKey] || null : null
  }))
}

/** The hub cards for a section: the same items, read for their `hub` block. */
export function hubCards(sectionId) {
  const section = SECTIONS.find((s) => s.id === sectionId)
  if (!section || typeof section.items === 'function') return []
  return section.items
    .filter((item) => item.hub)
    .map((item) => ({ title: item.hub.title || item.label, to: item.to, ...item.hub }))
}
