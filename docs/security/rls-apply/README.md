# Supabase RLS apply — 2026-08-01

These five SQL files were applied live against Supabase on **2026-08-01**, in order:
`phase-a.sql` → `phase-b.sql` → `phase-b-fix.sql` → `phase-b-fix2.sql` → `phase-c.sql`.

They close out the triage in [`supabase-rls-triage-2026-07-31.md`](../supabase-rls-triage-2026-07-31.md),
revising the draft plan in [`supabase-rls-migration-draft-2026-07-31.sql`](../supabase-rls-migration-draft-2026-07-31.sql)
after pre-apply verification against the live schema and the `ssi-learning-app` browser access paths.

## Defects found and fixed post-apply

Two policy-recursion bugs surfaced only once RLS was actually turned on (both `42P17 infinite
recursion detected`), and are fixed by the two `phase-b-fix*.sql` files:

1. **`schools` ↔ `user_tags` recursion** (`phase-b-fix.sql`) — `schools_select` and
   `classes_select` subqueried `user_tags`, whose own policies subqueried `schools`/`classes`.
   Enabling RLS on `schools` closed the cycle and broke the entire `/schools` read path. Fixed by
   moving the cross-table lookups into `SECURITY DEFINER` helpers (`has_user_tag`,
   `is_school_admin_of`) so the inner scans run as table owner and don't re-enter RLS. Policy
   predicates are unchanged.

2. **`classes` → `class_teachers` (a view) → `classes` recursion** (`phase-b-fix2.sql`) — the
   co-teacher clause added in `phase-b.sql`'s `classes_update` treated `class_teachers` as a
   table, but it's a view over `user_tags` joined back to `classes`. With RLS on, every `UPDATE`
   on `classes` re-entered `classes` via that join and failed — silently killing the teacher
   resume-pointer write (`useClassesData.updateClassProgress`). Fixed with a `SECURITY DEFINER`
   helper (`is_class_teacher`) that reads `user_tags` directly, reproducing the view's predicate
   (including `role_in_context = 'teacher'`) without re-entering RLS.

## Result

Supabase advisor ERROR count: **25 → 0**.
