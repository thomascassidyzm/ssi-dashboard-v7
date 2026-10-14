/**
 * booth-god-admins.cjs — who may see EVERY recording artist's takes.
 *
 * Aran, 2026-10-14: recording artists must never see each other's work. Popty's `admin` role is
 * wider than the people who should see all of it (seven accounts on 2026-10-14, one of them Kai,
 * who is also a recording artist), so the gate is the estate's ONE admin gate (hasAdminRole) AND
 * this named list. It is the one list: the artists overview (job #350) and the latest-takes route
 * (job #371) both ask isGodAdmin, and widening it is a one-line change here that a test pins.
 */

'use strict'

const { hasAdminRole } = require('../shared/popty-identity.cjs')

/** Tom's Popty login and Aran's — the two people Aran named on 2026-10-14. */
const GOD_ADMIN_EMAILS = Object.freeze(['thomas.cassidy+ssi@gmail.com', 'aran@hey.com'])

function isGodAdmin(identity) {
  if (!hasAdminRole(identity)) return false
  const email = String(identity.email || '').trim().toLowerCase()
  return GOD_ADMIN_EMAILS.includes(email)
}

module.exports = { GOD_ADMIN_EMAILS, isGodAdmin }
