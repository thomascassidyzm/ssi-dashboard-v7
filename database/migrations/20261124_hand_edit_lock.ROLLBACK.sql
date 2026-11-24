-- Rollback of 20261124_hand_edit_lock.sql (job #128·AL). Removes the hand-edit lock entirely.
-- The columns hold Aran's hand-edit record (who locked what, his round orders, held writes, the override log): if any
-- edits were made, read them out first (GET /api/production/kor_for_eng/course-editor shows them). The edits themselves
-- stay: text in known_text/target_text, intro wording in the presentation clip each LEGO points at.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS a0_hand_edit_lock ON public.course_legos;
DROP TRIGGER IF EXISTS a0_hand_edit_lock ON public.course_practice_phrases;
DROP FUNCTION IF EXISTS public.hand_edit_lock();
ALTER TABLE public.course_legos
  DROP COLUMN IF EXISTS hand_edited_by, DROP COLUMN IF EXISTS hand_edited_at, DROP COLUMN IF EXISTS intro_hand_by, DROP COLUMN IF EXISTS intro_hand_at,
  DROP COLUMN IF EXISTS phrase_order_hand_by, DROP COLUMN IF EXISTS phrase_order_hand_at, DROP COLUMN IF EXISTS hand_edit_held, DROP COLUMN IF EXISTS hand_lock_overrides;
ALTER TABLE public.course_practice_phrases
  DROP COLUMN IF EXISTS hand_edited_by, DROP COLUMN IF EXISTS hand_edited_at, DROP COLUMN IF EXISTS hand_order,
  DROP COLUMN IF EXISTS hand_edit_held, DROP COLUMN IF EXISTS hand_lock_overrides;
COMMIT;
NOTIFY pgrst, 'reload schema';
