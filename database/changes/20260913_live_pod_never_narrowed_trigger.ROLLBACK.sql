-- Undoes 20260913_live_pod_never_narrowed_trigger.sql by re-applying the
-- previous shape (20260913_live_pod_never_held_trigger.sql): only live -> held
-- is refused, and the trigger fires on visibility alone.
\i 20260913_live_pod_never_held_trigger.sql
