-- Undoes 20260913_live_pod_never_rescoped_trigger.sql by re-applying the
-- previous shape (20260913_live_pod_never_narrowed_trigger.sql): live A -> B
-- role changes are permitted again at the database (the route still refuses).
\i 20260913_live_pod_never_narrowed_trigger.sql
