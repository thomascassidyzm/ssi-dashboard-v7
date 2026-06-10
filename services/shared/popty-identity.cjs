// services/shared/popty-identity.cjs
// ONE rule for "who are you in Popty" when a Supabase-authenticated email is
// known. Pure decision logic, unit-tested — the resolver in production-api
// feeds it the rows.
//
// AUTHORITY ORDER (decided with Tom 2026-06-10):
//   1. dashboard_users row — THE Popty authorization authority. Roles,
//      courses, voice_id, invites and the team roster all live here; editing
//      this table must always change effective access (demotion sticks).
//   2. learners fallback — ssi_admin / educational_role 'god' get admin
//      WITHOUT needing a dashboard_users row (the single-account convenience:
//      one Supabase login works in the learning app AND Popty).
//   3. learners popty_user — legacy: courses from learners.dashboard_courses.
//      Kept for compatibility; new community users should get dashboard_users
//      rows via invites instead.
//
// Authentication stays single-source (the Supabase account). This module
// only decides AUTHORIZATION.

/**
 * @param {Object} args
 * @param {string} args.email - Supabase-authenticated email (trusted)
 * @param {Object|null} [args.dashboardRow] - { name, email, role, courses, voice_id } from dashboard_users
 * @param {Object|null} [args.learnerRow] - { id, display_name, platform_role, educational_role, dashboard_courses } from learners
 * @returns {Object|null} identity { name, email, role, courses, voice_id?, learner_id?, authority } or null (no Popty access)
 */
function resolvePoptyIdentity({ email, dashboardRow = null, learnerRow = null }) {
  if (!email) return null

  if (dashboardRow) {
    return {
      name: dashboardRow.name || learnerRow?.display_name || email,
      email,
      role: dashboardRow.role,
      courses: dashboardRow.courses,
      voice_id: dashboardRow.voice_id ?? null,
      learner_id: learnerRow?.id ?? null,
      authority: 'dashboard_users',
    }
  }

  if (learnerRow) {
    const pr = learnerRow.platform_role
    const er = learnerRow.educational_role
    if (pr === 'ssi_admin' || er === 'god') {
      return {
        name: learnerRow.display_name || email,
        email,
        role: 'admin',
        courses: '*',
        voice_id: null,
        learner_id: learnerRow.id ?? null,
        authority: 'learners',
      }
    }
    if (pr === 'popty_user') {
      const dc = learnerRow.dashboard_courses || []
      return {
        name: learnerRow.display_name || email,
        email,
        role: 'user',
        courses: dc.includes('*') ? '*' : dc,
        voice_id: null,
        learner_id: learnerRow.id ?? null,
        authority: 'learners',
      }
    }
  }

  return null
}

module.exports = { resolvePoptyIdentity }
