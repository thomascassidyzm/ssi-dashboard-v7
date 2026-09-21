-- =============================================================================
-- public.hq_facts() — THE COMPANY'S READABLE FACTS, COMPUTED ON EVERY READ
-- =============================================================================
-- Feeds GET /api/hq (services/api/hq-routes.cjs), the SSi HQ overview page.
--
-- Same posture as public.estate_map(): a QUERY, not a snapshot. No cache, no
-- materialised view, no cron. Every value below is recomputed per request, so a
-- figure on that page can never be stale, and no figure on that page was ever
-- typed by a human.
--
-- THIS FUNCTION RETURNS FACTS ONLY — never labels, never verdicts, never a
-- direction. The meaning of each fact, and the decision about what is readable
-- at all, lives beside the fact in services/api/hq-routes.cjs, so a change to
-- one lands next to the other.
--
-- A fact that has no source in this database is NOT in this function. The page
-- renders those as an honest blank ("the record cannot tell"), and a blank is a
-- different claim from a zero — see the tests in hq-routes.test.cjs.
--
-- UNLIKE estate_map(), THIS IS NOT PUBLIC. estate_map is deliberately
-- unauthenticated so any worker can curl it; these are company numbers, behind
-- requireAdmin at the HTTP layer and behind service_role here. New Supabase
-- tables arrive grant-open to anon (2026-09-21), so the grant is explicit.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hq_facts()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $function$
  SELECT jsonb_build_object(
    'generated_at', now(),

    -- Course production (Popty). Every content write carries an editor identity
    -- or is refused, so content_edit_events is the function's honest trace.
    'last_content_edit_at',      (SELECT max(occurred_at) FROM public.content_edit_events),
    'last_content_edit_actor',   (SELECT actor_label FROM public.content_edit_events ORDER BY occurred_at DESC LIMIT 1),
    'last_content_edit_kind',    (SELECT actor_kind  FROM public.content_edit_events ORDER BY occurred_at DESC LIMIT 1),
    'content_edits_7d',          (SELECT count(*) FROM public.content_edit_events WHERE occurred_at > now() - interval '7 days'),
    'content_edits_prior_7d',    (SELECT count(*) FROM public.content_edit_events WHERE occurred_at > now() - interval '14 days' AND occurred_at <= now() - interval '7 days'),
    'legos_7d',                  (SELECT count(*) FROM public.course_legos WHERE created_at > now() - interval '7 days'),
    'legos_prior_7d',            (SELECT count(*) FROM public.course_legos WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days'),
    'seeds_30d',                 (SELECT count(*) FROM public.course_seeds WHERE created_at > now() - interval '30 days'),
    'seeds_prior_30d',           (SELECT count(*) FROM public.course_seeds WHERE created_at > now() - interval '60 days' AND created_at <= now() - interval '30 days'),
    'courses_live',              (SELECT count(*) FROM public.courses WHERE new_app_status = 'live'),
    'courses_beta',              (SELECT count(*) FROM public.courses WHERE new_app_status = 'beta'),

    -- Voices.
    'last_audio_written_at',     (SELECT max(created_at) FROM public.course_audio),
    'active_voices',             (SELECT count(*) FROM public.voices WHERE coalesce(is_active, false)),

    -- The learning app. sessions, not player_events: the same answer for a
    -- thousandth of the scan, and this page must never be the slow query.
    'last_session_at',           (SELECT max(started_at) FROM public.sessions),
    'active_learners_7d',        (SELECT count(DISTINCT learner_id) FROM public.sessions WHERE started_at > now() - interval '7 days'),
    'active_learners_prior_7d',  (SELECT count(DISTINCT learner_id) FROM public.sessions WHERE started_at > now() - interval '14 days' AND started_at <= now() - interval '7 days'),
    -- Demo, test, internal and class-entity rows are NOT people. Every learner
    -- figure on the page is filtered the same way.
    'real_learners',             (SELECT count(*) FROM public.learners WHERE NOT coalesce(is_demo,false) AND NOT coalesce(is_internal,false) AND NOT coalesce(is_class_entity,false)),
    'new_learners_7d',           (SELECT count(*) FROM public.learners WHERE NOT coalesce(is_demo,false) AND NOT coalesce(is_internal,false) AND NOT coalesce(is_class_entity,false) AND created_at > now() - interval '7 days'),
    'new_learners_prior_7d',     (SELECT count(*) FROM public.learners WHERE NOT coalesce(is_demo,false) AND NOT coalesce(is_internal,false) AND NOT coalesce(is_class_entity,false) AND created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days'),

    -- Schools.
    'real_schools',              (SELECT count(*) FROM public.schools WHERE NOT coalesce(is_demo,false) AND NOT coalesce(is_test,false)),
    'schools_last_touch_at',     (SELECT max(greatest(created_at, coalesce(updated_at, created_at))) FROM public.schools WHERE NOT coalesce(is_demo,false) AND NOT coalesce(is_test,false)),
    'org_enrolments',            (SELECT count(*) FROM public.org_enrolments),

    -- Finance, as far as this database can see it — which is the NEW APP's
    -- Paddle billing and nothing else. The legacy platform's subscriber base is
    -- not in this project at all; the page says so on the number itself.
    'active_subscriptions',      (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'cancelled_subscriptions',   (SELECT count(*) FROM public.subscriptions WHERE status = 'cancelled'),
    'subs_new_30d',              (SELECT count(*) FROM public.subscriptions WHERE created_at > now() - interval '30 days'),
    'subs_new_prior_30d',        (SELECT count(*) FROM public.subscriptions WHERE created_at > now() - interval '60 days' AND created_at <= now() - interval '30 days'),
    'active_entitlements',       (SELECT count(*) FROM public.user_entitlements WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())),
    'last_billing_webhook_at',   (SELECT max(processed_at) FROM public.processed_webhook_events),

    -- Marketing. try_links is the only marketing instrument this database has,
    -- and a dead one is still a fact: the page shows the real last visit.
    'try_links',                 (SELECT count(*) FROM public.try_links),
    'last_try_link_visit_at',    (SELECT max(visited_at) FROM public.try_link_visits),

    -- The board. The table is built; nothing has ever written to it. Zero rows
    -- means NO TRACE, and the page renders that rather than a date.
    'board_snapshots',           (SELECT count(*) FROM public.board_snapshots),
    'last_board_snapshot_at',    (SELECT max(created_at) FROM public.board_snapshots)
  );
$function$;

REVOKE ALL ON FUNCTION public.hq_facts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_facts() FROM anon;
REVOKE ALL ON FUNCTION public.hq_facts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_facts() TO service_role;
