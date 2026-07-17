#!/usr/bin/env node
// One-off/idempotent seed for the pod-recording E2E suite. Creates (or
// resets) a Supabase Auth user with a known password + a matching
// dashboard_users row, so Playwright logs in through the real LoginForm
// instead of bypassing auth. Run manually or from the suite's global setup.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-pod-recording-test@ssi-test.invalid'
const PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E-pod-recording-test-pw-2026'

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) throw listErr
  let authUser = list.users.find(u => u.email === EMAIL)

  if (!authUser) {
    const { data, error } = await db.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { has_password: true }
    })
    if (error) throw error
    authUser = data.user
    console.log('Created Supabase auth user', authUser.id, EMAIL)
  } else {
    const { error } = await db.auth.admin.updateUserById(authUser.id, { password: PASSWORD, email_confirm: true })
    if (error) throw error
    console.log('Reset password for existing Supabase auth user', authUser.id, EMAIL)
  }

  const { error: dashErr } = await db.from('dashboard_users').upsert({
    email: EMAIL,
    name: 'E2E Pod Recording Test',
    role: 'admin',
    courses: '*',
    invited_by: 'e2e-pod-recording-test'
  }, { onConflict: 'email' })
  if (dashErr) throw dashErr
  console.log('Upserted dashboard_users row for', EMAIL, '(role=admin, courses=*)')
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
}

module.exports = { EMAIL, PASSWORD, seedTestUser: main }
