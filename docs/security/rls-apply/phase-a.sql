-- PHASE A — genuine write-path gaps. Unchanged from the draft.
-- Verified pre-apply: pod_legos is READ-ONLY from the browser
-- (player-vue usePodStage0.ts does .select only); audio_pass_requests has no
-- browser reader at all; invite_codes holds no anon/authenticated grants.
BEGIN;

-- G1: audio_pass_requests — service-key-only queue; anon currently has full CRUD.
REVOKE ALL ON public.audio_pass_requests FROM anon, authenticated;
ALTER TABLE public.audio_pass_requests ENABLE ROW LEVEL SECURITY;

-- G2: pod_legos — browser needs read only; anon currently has full CRUD.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pod_legos FROM anon, authenticated;
ALTER TABLE public.pod_legos ENABLE ROW LEVEL SECURITY;
CREATE POLICY pod_legos_public_read ON public.pod_legos
  FOR SELECT TO anon, authenticated USING (true);

-- G5: govt_admins — existing policies (self-read + is_god_user) match the app's reads.
ALTER TABLE public.govt_admins ENABLE ROW LEVEL SECURITY;

-- G7: invite_codes — drop the world-readable landmine, then enable.
DROP POLICY IF EXISTS invite_codes_select ON public.invite_codes;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

COMMIT;
