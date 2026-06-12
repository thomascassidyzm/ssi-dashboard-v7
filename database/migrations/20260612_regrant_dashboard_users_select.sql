-- ============================================================================
-- Re-grant SELECT on dashboard_users to authenticated
-- ============================================================================
-- The 2026-06-10 drift capture (20260610_drift_capture_dashboard_auth_rls.sql)
-- ran `REVOKE ALL ... FROM anon, authenticated` and recreated the own-row
-- POLICY — but a policy filters rows, it does not grant table privileges.
-- With the GRANT gone, every authenticated own-row read fails with
-- "permission denied", so the frontend's access lookup silently depends on
-- reaching a production machine over ngrok. When that tunnel blipped, admins
-- (Deborah, 2026-06-12) were invite-code-walled out of Popty.
--
-- This restores the table privilege. RLS still confines authenticated reads
-- to the caller's own row via authenticated_read_own_dashboard_user.
GRANT SELECT ON public.dashboard_users TO authenticated;

NOTIFY pgrst, 'reload schema';
