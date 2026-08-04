// Auth stub for the VAD Lab smoke: the app gates on (a) a Supabase session in
// localStorage and (b) a cached popty_dashboard_user row (useAuth.js initAuth
// restores the cache instantly; a failed background refresh never signs you
// out by design). Both are client-side state, so the suite fabricates them —
// no real credentials, no network login, works against a plain vite preview.
// The project ref is public (anon-key model), same one baked into the build.
const SUPABASE_REF = 'swfvymspfxmnfhevgdkg'

export async function stubAuth(page) {
  await page.addInitScript((ref) => {
    const now = Math.floor(Date.now() / 1000)
    const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '')
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
      sub: 'e2e',
      email: 'vad-e2e@test.local',
      role: 'authenticated',
      exp: now + 3600,
    })}.e2e`
    localStorage.setItem(
      `sb-${ref}-auth-token`,
      JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'e2e',
        user: {
          id: 'e2e',
          aud: 'authenticated',
          email: 'vad-e2e@test.local',
          user_metadata: {},
          app_metadata: {},
        },
      })
    )
    localStorage.setItem(
      'popty_dashboard_user',
      JSON.stringify({ email: 'vad-e2e@test.local', role: 'admin', courses: '*' })
    )
  }, SUPABASE_REF)
}
