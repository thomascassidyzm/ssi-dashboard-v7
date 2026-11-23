-- ============================================================================
-- JOB HOLDS: AN AGREED AUDIO JOB RESERVES ITS SIZE ONCE, THEN RENDERS
-- CONCURRENTLY (cs #502·AK; Tom 2026-11-22, r-2026-11-22-once-an-audio-job-is-agreed:
-- "There's no particular reason, once we've agreed to a job, for that job to be
-- running in series. One clip at a time. The size of the job is a fixed thing.").
--
-- WHY. Every paid clip calls tts_spend_reserve. That takes the GLOBAL
-- tts_spend:__total__ advisory lock and then the provider lock, and sums the day's
-- spend while it holds them. So fifteen concurrent asks queue one by one on a
-- single lock.
--
-- WHAT.
--   tts_spend_job_holds      one row per agreed batch: provider, course, job,
--                            roles, grant, reserved_chars, drawn_chars, expiry.
--   tts_spend_job_reserve    takes the SAME two locks in the SAME order and runs
--                            the SAME cap tiers with the SAME codes (Tom's stop,
--                            trip, hard ceiling, Tom-approved allowance,
--                            commissioned / automatic total cap, provider daily
--                            cap, cycle stop) for the whole batch at once. A
--                            re-record batch must name a Tom-signed, in-date,
--                            unrevoked, unspent grant covering its course and
--                            roles (RERECORD_NOT_PERMITTED otherwise).
--   tts_spend_job_draw       per clip: the provider lock ONLY (the per-provider
--                            hash chain needs it), then the hold row. Checks Tom's
--                            stop, the trip, that the hold is live, drawn + chars
--                            <= reserved (JOB_RESERVATION_EXCEEDED) and the repeat
--                            cap, then inserts the clip's own 'call' row. The
--                            audit log stays one row per clip.
--   tts_spend_job_release / _heartbeat   end a hold / keep it alive.
--   tts_spend_held, tts_spend_held_approved   a live hold's undrawn remainder.
--                            tts_spend_reserve and tts_spend_totals add it to
--                            today, the cycle and the total, so a hold spends
--                            the day's budget the moment it is taken. A draw
--                            moves chars from the hold into the ledger under the
--                            provider lock, so no total changes. These are
--                            STABLE, so each sum reads in its caller's
--                            statement snapshot.
-- A hold is LIVE while it is not released, not past expires_at (at most 2 h, and
-- never past the next UTC midnight, because caps are per UTC day), and has had a
-- draw or heartbeat in the last 5 minutes. A crashed job's hold dies on its own;
-- nothing needs to clear it.
--
-- tts_spend_reserve and tts_spend_totals change ONLY by the added hold terms;
-- every cap, lock, message and order is the 20261025 text byte for byte
-- (generated from ops/sql/20261025-tts-spend-daily-rollup.sql).
--
-- Lock order everywhere: __total__ → provider → hold row. Draw: provider → hold
-- row. Release / heartbeat: hold row only. No cycle, so no deadlock.
--
-- APPLY: Tom's go only. Direct psql as the owner, as popty
-- (sudo -u popty -H <runner>). Then set TTS_SPEND_JOB_HOLDS=on on the phase8 unit.
-- Until both are done the batch route answers 409 JOB_HOLDS_OFF and Popty is
-- unchanged. Rollback: 20261122-tts-spend-job-holds.ROLLBACK.sql
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
-- The live reserve and totals must still be EXACTLY the text this migration was generated from (the 20261025 rollup):
-- CREATE OR REPLACE below overwrites them whole, so any hand-applied change since would be lost silently.
-- Fable review #756·AK fix 5: the guard compares an md5 of pg_get_functiondef to a constant, not marker substrings.
-- THE CONSTANTS ARE NOT FILLED IN YET, on purpose: cs #761 could not read the live or nightly QA copy's function text
-- (no hand-written DB code, Tom's HARD RULE 2026-10-14, and no committed tool reads it). Until they are, this guard
-- REFUSES and its message prints the md5s it found. To fill them: rehearse on the nightly QA copy with the committed
-- runner (SSI_OWNER_ENV=<qa-copy env> tools/migrations-20261122-tts-spend-job-holds.sh apply), check that the QA
-- copy's tts_spend_reserve / tts_spend_totals are the 20261025 text, copy the two md5s from the refusal into
-- v_reserve_md5 / v_totals_md5, land that commit, and rehearse again. A live DB whose functions differ from the
-- QA copy's is then refused, which is the point. The marker checks stay as a second, cheaper statement of the same.
DO $guard$
DECLARE
  v_reserve_md5 constant text := 'FILL-FROM-NIGHTLY-QA-COPY';
  v_totals_md5  constant text := 'FILL-FROM-NIGHTLY-QA-COPY';
  v_reserve_live text := md5(pg_get_functiondef('public.tts_spend_reserve'::regproc));
  v_totals_live  text := md5(pg_get_functiondef('public.tts_spend_totals'::regproc));
BEGIN
  IF position('tts_spend_daily where kind = ''call''' in pg_get_functiondef('public.tts_spend_reserve'::regproc)) = 0
     OR position('tts_spend_held' in pg_get_functiondef('public.tts_spend_reserve'::regproc)) > 0
     OR position('tts_spend_daily where provider' in pg_get_functiondef('public.tts_spend_totals'::regproc)) = 0 THEN
    RAISE EXCEPTION 'tts_spend_reserve/totals are not the 20261025 rollup text: regenerate this migration from the live text';
  END IF;
  IF v_reserve_live IS DISTINCT FROM v_reserve_md5 OR v_totals_live IS DISTINCT FROM v_totals_md5 THEN
    RAISE EXCEPTION 'tts_spend_reserve/totals text is not the one this migration was generated from: live md5 reserve=% totals=%, expected reserve=% totals=%. If this is the nightly QA copy rehearsal and its text is the 20261025 rollup, put the live md5s into the guard constants; otherwise regenerate this migration from the live text',
      v_reserve_live, v_totals_live, v_reserve_md5, v_totals_md5;
  END IF;
END
$guard$;

CREATE TABLE public.tts_spend_job_holds (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  day            date        NOT NULL,
  provider       text        NOT NULL,
  course         text        NOT NULL,
  job            text        NOT NULL CHECK (job ~ '#[0-9]+'),
  roles          text[],
  grant_id       bigint REFERENCES public.tts_rerecord_permissions(id),
  reserved_chars bigint      NOT NULL CHECK (reserved_chars > 0),
  drawn_chars    bigint      NOT NULL DEFAULT 0 CHECK (drawn_chars >= 0 AND drawn_chars <= reserved_chars),
  draws          integer     NOT NULL DEFAULT 0,
  expires_at     timestamptz NOT NULL,
  heartbeat_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  released_at    timestamptz,
  host           text,
  pid            integer,
  limits         jsonb,
  note           text
);
-- The open set is a handful of rows; every reserve scans it under the lock.
CREATE INDEX tts_spend_job_holds_open ON public.tts_spend_job_holds (day) WHERE released_at IS NULL;
-- Service-role only, like the ledger (RLS doctrine rule 7).
ALTER TABLE public.tts_spend_job_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tts_spend_job_holds FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tts_spend_job_holds TO service_role;

-- Stale after this long with no draw or heartbeat (the route heartbeats every 60 s).
CREATE OR REPLACE FUNCTION public.tts_spend_hold_stale_after()
RETURNS interval LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$ select interval '5 minutes' $$;

-- The undrawn remainder of LIVE holds; p_provider / p_job_re null = every one.
CREATE OR REPLACE FUNCTION public.tts_spend_held(p_provider text, p_job_re text, p_now timestamptz)
RETURNS bigint LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  select coalesce(sum(greatest(h.reserved_chars - h.drawn_chars, 0)), 0)::bigint
    from public.tts_spend_job_holds h
   where h.released_at is null and h.day = (p_now at time zone 'UTC')::date
     and h.expires_at > p_now and h.heartbeat_at > p_now - public.tts_spend_hold_stale_after()
     and (p_provider is null or h.provider = p_provider)
     and (p_job_re is null or h.job ~ p_job_re)
$$;

-- Live holds whose job is a Tom-approved run (mirrors v_approved_all in tts_spend_reserve).
CREATE OR REPLACE FUNCTION public.tts_spend_held_approved(p_now timestamptz)
RETURNS bigint LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  select coalesce(sum(greatest(h.reserved_chars - h.drawn_chars, 0)), 0)::bigint
    from public.tts_spend_job_holds h
   where h.released_at is null and h.day = (p_now at time zone 'UTC')::date
     and h.expires_at > p_now and h.heartbeat_at > p_now - public.tts_spend_hold_stale_after()
     and exists (
       select 1 from public.tts_spend_total_cap_raises r
        where r.job is not null and r.by ~* '^\s*tom\M' and nullif(btrim(r.why), '') is not null and r.until > p_now and r.until <= r.at + interval '31 days'
          and h.job ~ (r.job || '(?![0-9])'))
$$;

-- ── tts_spend_reserve and tts_spend_totals: the 20261025 text plus the hold terms ──
CREATE OR REPLACE FUNCTION public.tts_spend_reserve(p_provider text, p_voice text, p_chars integer, p_repeat_key text, p_text_hash text, p_course text, p_job text, p_language text, p_attempt integer, p_host text, p_pid integer, p_daily_cap bigint, p_cycle_start_day integer, p_cycle_cap bigint, p_repeat_max integer, p_repeat_window_hours integer, p_limits jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_now    timestamptz := clock_timestamp();
  v_day    timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_cycle0 timestamptz := public.tts_spend_cycle_start(v_now, p_cycle_start_day);
  v_today  bigint; v_cycle bigint; v_seen integer := 0; v_trip record; v_id bigint; v_hash text; v_last text; v_total bigint; v_raised bigint; v_total_cap bigint;
  v_ceiling constant bigint := 3000000; v_approval record; v_approved_all bigint; v_approved_here bigint;
begin
  if p_provider is null or p_chars is null or p_chars < 0 then
    return jsonb_build_object('ok', false, 'code', 'BAD_CALL', 'message', 'provider and a non-negative chars are required');
  end if;
  if p_daily_cap is null or p_cycle_cap is null or p_repeat_max is null or p_repeat_window_hours is null then
    return jsonb_build_object('ok', false, 'code', 'NO_LIMITS', 'message', 'a reservation must carry its limits — refusing an unbounded call');
  end if;

  -- TOM'S STOP (job #676, Tom 2026-09-28 23:40Z): one row with provider = '*'
  -- stops EVERY provider, including names nobody has listed yet, on every host.
  -- Checked before anything else and never cleared by a caller: only Tom lifts it
  -- (node tools/tts-stop.cjs lift).
  select * into v_trip from public.tts_spend_trips where provider = '*';
  if found then
    return jsonb_build_object('ok', false, 'code', 'STOPPED_BY_TOM',
      'message', format('audio generation stopped by Tom since %s: %s. This is not a fault and not a limit to work around: do not retry, do not split the job, do not clear it. Only Tom lifts it', v_trip.at, v_trip.message));
  end if;

  -- THE DAILY TOTAL CAP (job #692, Tom 2026-09-29 00:25Z: "limit it to 50,000
  -- characters per day TOTAL without my express approval"). One figure across
  -- EVERY provider (named or not), caller and person, counted from this ledger
  -- for the UTC day. Its lock is taken BEFORE the per-provider lock (always in
  -- that order, so no deadlock) so two providers cannot each pass the check
  -- and together overshoot. Only a signed raise naming Tom (tts_spend_total_cap_raises,
  -- in date, at most 31 days) lifts it; no caller can pass a bigger figure.
  perform pg_advisory_xact_lock(hashtext('tts_spend:__total__'));
  perform pg_advisory_xact_lock(hashtext('tts_spend:' || p_provider));

  select * into v_trip from public.tts_spend_trips where provider = p_provider;
  if found then
    return jsonb_build_object('ok', false, 'code', 'TRIPPED',
      'message', format('renders are stopped for %s since %s: %s. Clear: delete from tts_spend_trips where provider = %L — once a human has looked', p_provider, v_trip.at, v_trip.message, p_provider));
  end if;

  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_today from public.tts_spend_daily where provider = p_provider and day >= (v_day at time zone 'UTC')::date;
  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_cycle from public.tts_spend_daily where provider = p_provider and day >= (v_cycle0 at time zone 'UTC')::date;
  if p_repeat_key is not null then
    select count(*) into v_seen from public.tts_spend_ledger
     where repeat_key = p_repeat_key and kind = 'call' and at >= v_now - make_interval(hours => p_repeat_window_hours);
  end if;

  if p_limits is not null then
    v_hash := md5(p_limits::text);
    select limits_hash into v_last from public.tts_spend_limit_log where provider = p_provider order by id desc limit 1;
    if v_last is distinct from v_hash then
      insert into public.tts_spend_limit_log (provider, host, limits, limits_hash) values (p_provider, p_host, p_limits, v_hash);
    end if;
  end if;

  -- THE DAILY TOTAL CAP, two tiers (job #913, Tom 2026-09-30 11:38Z: "If other
  -- people want to generate audio, we still have 100,000 character cap. But if I
  -- am approving a run, we can just go ahead and do it. It would probably be
  -- sensible to have a cap at something like maybe 300,000").
  --   AUTOMATIC   every caller: 1,000,000 chars/UTC day across all providers, not
  --               counting what Tom-approved runs spent today (so his run never
  --               starves anyone else's automatic allowance).
  --   APPROVED    a call whose p_job matches a signed approval row
  --               (tts_spend_total_cap_raises.job = '#NNN', by Tom, dated) spends
  --               from that job's own allowance, cap_chars, never above 300,000.
  --   CEILING     nothing, approved or not, takes the day past 300,000 in total.
  -- An approval row is written only by tools/tts-cap.cjs approve, on Tom's word.
  select coalesce(sum(chars), 0) + public.tts_spend_held(null, null, v_now) into v_total from public.tts_spend_daily where kind = 'call' and day >= (v_day at time zone 'UTC')::date;
  select coalesce(max(cap_chars), 0) into v_raised from public.tts_spend_total_cap_raises
   where job is null and by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days';
  select coalesce(sum(l.chars), 0) + public.tts_spend_held_approved(v_now) into v_approved_all from public.tts_spend_daily_job l
   where l.day >= (v_day at time zone 'UTC')::date and exists (
     select 1 from public.tts_spend_total_cap_raises r
      where r.job is not null and r.by ~* '^\s*tom\M' and nullif(btrim(r.why), '') is not null and r.until > v_now and r.until <= r.at + interval '31 days'
        and l.job ~ (r.job || '(?![0-9])'));
  select * into v_approval from public.tts_spend_total_cap_raises
     where p_job is not null and job is not null and by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days'
       and p_job ~ (job || '(?![0-9])')
     order by cap_chars desc limit 1;
  if v_total + p_chars > v_ceiling then
    return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen, 'total', v_total, 'cap', v_ceiling,
      'message', format('the hard daily ceiling is reached (%s chars spent today across all providers, this call is %s, the ceiling is %s even for a Tom-approved run; UTC day). Do not retry and do not split the job', v_total, p_chars, v_ceiling));
  end if;
  if v_approval.id is not null then
    select coalesce(sum(chars), 0) + public.tts_spend_held(null, v_approval.job || '(?![0-9])', v_now) into v_approved_here from public.tts_spend_daily_job
     where day >= (v_day at time zone 'UTC')::date and job ~ (v_approval.job || '(?![0-9])');
    v_total_cap := least(v_approval.cap_chars, v_ceiling);
    if v_approved_here + p_chars > v_total_cap then
      return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen, 'total', v_approved_here, 'cap', v_total_cap,
        'message', format('Tom-approved run %s has spent %s chars today; this call (%s) would pass its approval of %s (by %s, until %s; UTC day). Do not retry and do not split the job', v_approval.job, v_approved_here, p_chars, v_total_cap, v_approval."by", v_approval.until));
    end if;
  elsif coalesce((p_limits->>'commissioned')::boolean, false) then
    null; -- a live commissioned job (job #661): only the 2,000,000 ceiling above stops it
  else
    v_total_cap := least(v_ceiling, greatest(1000000, v_raised));
    if (v_total - v_approved_all) + p_chars > v_total_cap then
      return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen, 'total', v_total - v_approved_all, 'cap', v_total_cap,
        'message', format('daily audio cap reached; only Tom can approve more (%s chars spent today across all providers outside Tom-approved runs, this call is %s, the cap is %s; UTC day). Do not retry and do not split the job', v_total - v_approved_all, p_chars, v_total_cap));
    end if;
  end if;
  if v_today + p_chars > p_daily_cap then
    return jsonb_build_object('ok', false, 'code', 'DAILY_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen,
      'message', format('today''s %s spend is %s chars; this call (%s) would pass the daily cap of %s', p_provider, v_today, p_chars, p_daily_cap));
  end if;
  if v_cycle + p_chars > p_cycle_cap then
    return jsonb_build_object('ok', false, 'code', 'POOL_SHARE', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen,
      'message', format('this cycle''s %s spend is %s chars (since %s); this call (%s) would pass the cycle stop of %s', p_provider, v_cycle, v_cycle0, p_chars, p_cycle_cap));
  end if;
  if p_repeat_key is not null and v_seen >= p_repeat_max then
    return jsonb_build_object('ok', false, 'code', 'REPEAT', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen,
      'message', format('these words in voice %s have already been sent %s times in %sh (limit %s) — a caller is re-rendering what it already has', coalesce(p_voice, '?'), v_seen, p_repeat_window_hours, p_repeat_max));
  end if;

  v_id := public.tts_spend_insert('call', p_provider, p_voice, p_chars, p_repeat_key, p_text_hash, p_course, p_job, p_language, p_attempt, p_host, p_pid, 'reserved', null, v_now);
  return jsonb_build_object('ok', true, 'id', v_id, 'today', v_today + p_chars, 'cycle', v_cycle + p_chars, 'seen', v_seen + 1);
end $function$
;

CREATE OR REPLACE FUNCTION public.tts_spend_totals(p_provider text, p_cycle_start_day integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'provider', p_provider,
    'today', (select coalesce(sum(chars), 0) from public.tts_spend_daily where provider = p_provider
               and day >= (now() at time zone 'UTC')::date) + public.tts_spend_held(p_provider, null, now()),
    'cycle', (select coalesce(sum(chars), 0) from public.tts_spend_daily where provider = p_provider
               and day >= (public.tts_spend_cycle_start(now(), p_cycle_start_day) at time zone 'UTC')::date) + public.tts_spend_held(p_provider, null, now()),
    'held', public.tts_spend_held(p_provider, null, now()),
    'cycle_start', public.tts_spend_cycle_start(now(), p_cycle_start_day),
    'tripped', (select to_jsonb(t) from public.tts_spend_trips t where t.provider = p_provider))
$function$
;


-- ── JOB RESERVE: the whole agreed batch, once, under the same locks and caps ──
-- The cap block below is tts_spend_reserve's, with p_chars = the batch's size.
-- Its messages are the same words, so a refused hold reads as a refused call does.
CREATE OR REPLACE FUNCTION public.tts_spend_job_reserve(p_provider text, p_course text, p_job text, p_roles text[], p_grant_id bigint, p_rerecord boolean,
  p_chars bigint, p_ttl_seconds integer, p_host text, p_pid integer, p_daily_cap bigint, p_cycle_start_day integer, p_cycle_cap bigint, p_limits jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_now    timestamptz := clock_timestamp();
  v_day    timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_cycle0 timestamptz := public.tts_spend_cycle_start(v_now, p_cycle_start_day);
  v_today  bigint; v_cycle bigint; v_trip record; v_id bigint; v_hash text; v_last text; v_total bigint; v_raised bigint; v_total_cap bigint;
  v_ceiling constant bigint := 3000000; v_approval record; v_approved_all bigint; v_approved_here bigint;
  v_grant record; v_used integer; v_expires timestamptz;
begin
  if p_provider is null or p_chars is null or p_chars <= 0 or p_course is null or p_job is null or p_job !~ '#[0-9]+' then
    return jsonb_build_object('ok', false, 'code', 'BAD_CALL', 'message', 'a job hold needs a provider, a course, a job "#NNN" and a positive chars');
  end if;
  if p_daily_cap is null or p_cycle_cap is null then
    return jsonb_build_object('ok', false, 'code', 'NO_LIMITS', 'message', 'a reservation must carry its limits — refusing an unbounded call');
  end if;
  -- At most 2 h, and never past the next UTC midnight: the caps it counts against are per UTC day.
  v_expires := least(v_now + make_interval(secs => greatest(60, least(7200, coalesce(p_ttl_seconds, 3600)))), v_day + interval '1 day');

  select * into v_trip from public.tts_spend_trips where provider = '*';
  if found then
    return jsonb_build_object('ok', false, 'code', 'STOPPED_BY_TOM',
      'message', format('audio generation stopped by Tom since %s: %s. This is not a fault and not a limit to work around: do not retry, do not split the job, do not clear it. Only Tom lifts it', v_trip.at, v_trip.message));
  end if;

  perform pg_advisory_xact_lock(hashtext('tts_spend:__total__'));
  perform pg_advisory_xact_lock(hashtext('tts_spend:' || p_provider));

  select * into v_trip from public.tts_spend_trips where provider = p_provider;
  if found then
    return jsonb_build_object('ok', false, 'code', 'TRIPPED',
      'message', format('renders are stopped for %s since %s: %s. Clear: delete from tts_spend_trips where provider = %L — once a human has looked', p_provider, v_trip.at, v_trip.message, p_provider));
  end if;

  -- A SIGNED JOB RAISE holds ONE batch at a time (Fable review #756·AK fix 6). Its allowance is checked in the guard
  -- from the ledger plus live holds (jobToday), and a raised job skips the provider daily cap, so a second concurrent
  -- hold could pass the allowance by the first one's remainder if both read before either was taken. The guard names
  -- the raise in p_limits.exclusiveJob; under __total__ that check-then-insert cannot interleave with another reserve.
  if p_limits ? 'exclusiveJob' and exists (
       select 1 from public.tts_spend_job_holds h
        where h.released_at is null and h.day = (v_now at time zone 'UTC')::date and h.expires_at > v_now
          and h.heartbeat_at > v_now - public.tts_spend_hold_stale_after()
          and h.job ~ ((p_limits->>'exclusiveJob') || '(?![0-9])')) then
    return jsonb_build_object('ok', false, 'code', 'JOB_HOLD_LIVE',
      'message', format('job %s runs under Tom''s signed raise and already has a live batch reservation; one batch at a time for a raised job — send the next batch when this one answers', p_limits->>'exclusiveJob'));
  end if;

  -- THE RE-RECORD GRANT, up front (Tom 2026-10-11: no re-recording without his express permission). A batch
  -- that says it re-records, or names a grant, is held only on a grant that is Tom's, in date, unrevoked, for
  -- this course, covering every role the batch names, and not spent. Each clip still passes the per-clip gate
  -- (services/shared/rerecord-gate.cjs), which logs and reserves its own use.
  if coalesce(p_rerecord, false) or p_grant_id is not null then
    select * into v_grant from public.tts_rerecord_permissions where id = p_grant_id;
    if not found or v_grant.course_code is distinct from p_course or v_grant.revoked_at is not null
       or v_grant.by !~* '^\s*tom\M' or nullif(btrim(v_grant.why), '') is null
       or not (v_grant.until > v_now) or not (v_grant.until <= v_grant.at + interval '31 days')
       or (v_grant.roles is not null and cardinality(v_grant.roles) > 0 and not (coalesce(p_roles, array[]::text[]) <@ v_grant.roles and cardinality(coalesce(p_roles, array[]::text[])) > 0)) then
      return jsonb_build_object('ok', false, 'code', 'RERECORD_NOT_PERMITTED',
        'message', format('%s: a re-record batch needs Tom''s express permission (Tom 2026-10-11) — grant %s is missing, expired, revoked, not Tom''s, or does not cover roles %s. Do not retry or route around this', p_course, coalesce(p_grant_id::text, '(none named)'), coalesce(array_to_string(p_roles, ','), '(none named)')));
    end if;
    if v_grant.max_clips is not null then
      select count(*) into v_used from public.tts_rerecord_log where permission_id = v_grant.id and kind = 'permitted';
      if v_used >= v_grant.max_clips then
        return jsonb_build_object('ok', false, 'code', 'RERECORD_NOT_PERMITTED',
          'message', format('%s: Tom''s permission #%s is spent (%s of %s clips). Do not retry or route around this', p_course, v_grant.id, v_used, v_grant.max_clips));
      end if;
    end if;
  end if;

  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_today from public.tts_spend_daily where provider = p_provider and day >= (v_day at time zone 'UTC')::date;
  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_cycle from public.tts_spend_daily where provider = p_provider and day >= (v_cycle0 at time zone 'UTC')::date;

  if p_limits is not null then
    v_hash := md5(p_limits::text);
    select limits_hash into v_last from public.tts_spend_limit_log where provider = p_provider order by id desc limit 1;
    if v_last is distinct from v_hash then
      insert into public.tts_spend_limit_log (provider, host, limits, limits_hash) values (p_provider, p_host, p_limits, v_hash);
    end if;
  end if;

  select coalesce(sum(chars), 0) + public.tts_spend_held(null, null, v_now) into v_total from public.tts_spend_daily where kind = 'call' and day >= (v_day at time zone 'UTC')::date;
  select coalesce(max(cap_chars), 0) into v_raised from public.tts_spend_total_cap_raises
   where job is null and by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days';
  select coalesce(sum(l.chars), 0) + public.tts_spend_held_approved(v_now) into v_approved_all from public.tts_spend_daily_job l
   where l.day >= (v_day at time zone 'UTC')::date and exists (
     select 1 from public.tts_spend_total_cap_raises r
      where r.job is not null and r.by ~* '^\s*tom\M' and nullif(btrim(r.why), '') is not null and r.until > v_now and r.until <= r.at + interval '31 days'
        and l.job ~ (r.job || '(?![0-9])'));
  select * into v_approval from public.tts_spend_total_cap_raises
     where p_job is not null and job is not null and by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days'
       and p_job ~ (job || '(?![0-9])')
     order by cap_chars desc limit 1;
  if v_total + p_chars > v_ceiling then
    return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'total', v_total, 'cap', v_ceiling,
      'message', format('the hard daily ceiling is reached (%s chars spent today across all providers, this call is %s, the ceiling is %s even for a Tom-approved run; UTC day). Do not retry and do not split the job', v_total, p_chars, v_ceiling));
  end if;
  if v_approval.id is not null then
    select coalesce(sum(chars), 0) + public.tts_spend_held(null, v_approval.job || '(?![0-9])', v_now) into v_approved_here from public.tts_spend_daily_job
     where day >= (v_day at time zone 'UTC')::date and job ~ (v_approval.job || '(?![0-9])');
    v_total_cap := least(v_approval.cap_chars, v_ceiling);
    if v_approved_here + p_chars > v_total_cap then
      return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'total', v_approved_here, 'cap', v_total_cap,
        'message', format('Tom-approved run %s has spent %s chars today; this call (%s) would pass its approval of %s (by %s, until %s; UTC day). Do not retry and do not split the job', v_approval.job, v_approved_here, p_chars, v_total_cap, v_approval."by", v_approval.until));
    end if;
  elsif coalesce((p_limits->>'commissioned')::boolean, false) then
    null; -- a live commissioned job (job #661): only the ceiling above stops it
  else
    v_total_cap := least(v_ceiling, greatest(1000000, v_raised));
    if (v_total - v_approved_all) + p_chars > v_total_cap then
      return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'total', v_total - v_approved_all, 'cap', v_total_cap,
        'message', format('daily audio cap reached; only Tom can approve more (%s chars spent today across all providers outside Tom-approved runs, this call is %s, the cap is %s; UTC day). Do not retry and do not split the job', v_total - v_approved_all, p_chars, v_total_cap));
    end if;
  end if;
  if v_today + p_chars > p_daily_cap then
    return jsonb_build_object('ok', false, 'code', 'DAILY_CAP', 'today', v_today, 'cycle', v_cycle,
      'message', format('today''s %s spend is %s chars; this call (%s) would pass the daily cap of %s', p_provider, v_today, p_chars, p_daily_cap));
  end if;
  if v_cycle + p_chars > p_cycle_cap then
    return jsonb_build_object('ok', false, 'code', 'POOL_SHARE', 'today', v_today, 'cycle', v_cycle,
      'message', format('this cycle''s %s spend is %s chars (since %s); this call (%s) would pass the cycle stop of %s', p_provider, v_cycle, v_cycle0, p_chars, p_cycle_cap));
  end if;

  insert into public.tts_spend_job_holds (at, day, provider, course, job, roles, grant_id, reserved_chars, expires_at, heartbeat_at, host, pid, limits)
  values (v_now, (v_day at time zone 'UTC')::date, p_provider, p_course, p_job, p_roles, p_grant_id, p_chars, v_expires, v_now, p_host, p_pid, p_limits)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'reserved', p_chars, 'expires_at', v_expires, 'today', v_today + p_chars, 'cycle', v_cycle + p_chars);
end $function$
;

-- ── JOB DRAW: one clip's chars out of its hold, into the ledger. No global lock. ──
CREATE OR REPLACE FUNCTION public.tts_spend_job_draw(p_hold_id bigint, p_provider text, p_voice text, p_chars integer, p_repeat_key text, p_text_hash text,
  p_language text, p_attempt integer, p_host text, p_pid integer, p_cycle_start_day integer, p_repeat_max integer, p_repeat_window_hours integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_now  timestamptz := clock_timestamp();
  v_day  timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_h record; v_trip record; v_seen integer := 0; v_id bigint; v_today bigint; v_cycle bigint;
begin
  if p_hold_id is null or p_provider is null or p_chars is null or p_chars < 0 or p_repeat_max is null or p_repeat_window_hours is null then
    return jsonb_build_object('ok', false, 'code', 'BAD_CALL', 'message', 'a draw needs its hold, provider, a non-negative chars and the repeat limits');
  end if;
  select * into v_trip from public.tts_spend_trips where provider = '*';
  if found then
    return jsonb_build_object('ok', false, 'code', 'STOPPED_BY_TOM',
      'message', format('audio generation stopped by Tom since %s: %s. This is not a fault and not a limit to work around: do not retry, do not split the job, do not clear it. Only Tom lifts it', v_trip.at, v_trip.message));
  end if;
  -- The provider lock only: the per-provider hash chain in tts_spend_insert needs it. Never __total__.
  perform pg_advisory_xact_lock(hashtext('tts_spend:' || p_provider));
  select * into v_trip from public.tts_spend_trips where provider = p_provider;
  if found then
    return jsonb_build_object('ok', false, 'code', 'TRIPPED',
      'message', format('renders are stopped for %s since %s: %s. Clear: delete from tts_spend_trips where provider = %L — once a human has looked', p_provider, v_trip.at, v_trip.message, p_provider));
  end if;
  select * into v_h from public.tts_spend_job_holds where id = p_hold_id for update;
  if not found or v_h.provider is distinct from p_provider then
    return jsonb_build_object('ok', false, 'code', 'JOB_RESERVATION_GONE', 'message', format('no %s job reservation #%s — refusing a clip with no reservation behind it', p_provider, p_hold_id));
  end if;
  -- The clock is read AGAIN now the locks are held (Fable review #756·AK fix 4): v_now was taken at entry, before the
  -- wait on the provider lock and the row lock. A reserve that ran meanwhile, with a later clock, may already have
  -- judged this hold stale and counted its remainder as free; judging liveness (and writing heartbeat_at) with the
  -- entry time would revive it. Everything below — liveness, the repeat window, the ledger row, the totals — uses this time.
  v_now := clock_timestamp();
  v_day := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  if v_h.released_at is not null or v_h.expires_at <= v_now or v_h.heartbeat_at <= v_now - public.tts_spend_hold_stale_after()
     or v_h.day <> (v_now at time zone 'UTC')::date then
    return jsonb_build_object('ok', false, 'code', 'JOB_RESERVATION_EXPIRED',
      'message', format('job reservation #%s (%s) is %s — its remainder no longer counts, so nothing more may be drawn from it. Take a new reservation', p_hold_id, v_h.job,
        case when v_h.released_at is not null then 'released' when v_h.day <> (v_now at time zone 'UTC')::date then 'from an earlier UTC day' when v_h.expires_at <= v_now then 'past its expiry' else 'stale (no draw or heartbeat in 5 minutes)' end));
  end if;
  if v_h.drawn_chars + p_chars > v_h.reserved_chars then
    return jsonb_build_object('ok', false, 'code', 'JOB_RESERVATION_EXCEEDED', 'drawn', v_h.drawn_chars, 'reserved', v_h.reserved_chars,
      'message', format('job %s has drawn %s of the %s chars it reserved (#%s); this clip (%s) would pass its reservation. Do not retry and do not split the job', v_h.job, v_h.drawn_chars, v_h.reserved_chars, p_hold_id, p_chars));
  end if;
  if p_repeat_key is not null then
    select count(*) into v_seen from public.tts_spend_ledger
     where repeat_key = p_repeat_key and kind = 'call' and at >= v_now - make_interval(hours => p_repeat_window_hours);
    if v_seen >= p_repeat_max then
      return jsonb_build_object('ok', false, 'code', 'REPEAT', 'seen', v_seen,
        'message', format('these words in voice %s have already been sent %s times in %sh (limit %s) — a caller is re-rendering what it already has', coalesce(p_voice, '?'), v_seen, p_repeat_window_hours, p_repeat_max));
    end if;
  end if;
  v_id := public.tts_spend_insert('call', p_provider, p_voice, p_chars, p_repeat_key, p_text_hash, v_h.course, v_h.job, p_language, p_attempt, p_host, p_pid, 'reserved', format('hold #%s', p_hold_id), v_now);
  update public.tts_spend_job_holds set drawn_chars = drawn_chars + p_chars, draws = draws + 1, heartbeat_at = v_now where id = p_hold_id;
  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_today from public.tts_spend_daily where provider = p_provider and day >= (v_day at time zone 'UTC')::date;
  select coalesce(sum(chars), 0) + public.tts_spend_held(p_provider, null, v_now) into v_cycle from public.tts_spend_daily where provider = p_provider and day >= (public.tts_spend_cycle_start(v_now, p_cycle_start_day) at time zone 'UTC')::date;
  return jsonb_build_object('ok', true, 'id', v_id, 'today', v_today, 'cycle', v_cycle, 'seen', v_seen + 1, 'drawn', v_h.drawn_chars + p_chars, 'reserved', v_h.reserved_chars);
end $function$
;

-- ── RELEASE: the remainder stops counting. Idempotent. ──
CREATE OR REPLACE FUNCTION public.tts_spend_job_release(p_hold_id bigint, p_note text DEFAULT NULL)
 RETURNS jsonb LANGUAGE sql SET search_path = public, pg_temp AS $function$
  with u as (
    update public.tts_spend_job_holds set released_at = coalesce(released_at, clock_timestamp()), note = coalesce(p_note, note)
     where id = p_hold_id returning id, reserved_chars, drawn_chars, draws, released_at)
  select coalesce((select jsonb_build_object('ok', true, 'id', id, 'reserved', reserved_chars, 'drawn', drawn_chars, 'draws', draws, 'released', reserved_chars - drawn_chars, 'released_at', released_at) from u),
                  jsonb_build_object('ok', false, 'code', 'JOB_RESERVATION_GONE'))
$function$;

-- ── HEARTBEAT: keep a live hold live while its renders are slow. A dead hold stays dead. ──
CREATE OR REPLACE FUNCTION public.tts_spend_job_heartbeat(p_hold_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_h record; v_now timestamptz;
begin
  select * into v_h from public.tts_spend_job_holds where id = p_hold_id for update;
  if not found then return false; end if;
  -- One clock, read after the row lock (Fable review #756·AK fix 4), so a beat that waited on a draw cannot judge
  -- liveness with a time from before the wait.
  v_now := clock_timestamp();
  if v_h.released_at is not null or v_h.expires_at <= v_now or v_h.heartbeat_at <= v_now - public.tts_spend_hold_stale_after()
     or v_h.day <> (v_now at time zone 'UTC')::date then
    return false;
  end if;
  update public.tts_spend_job_holds set heartbeat_at = v_now where id = p_hold_id;
  return true;
end $function$;

-- Functions: service_role only.
REVOKE ALL ON FUNCTION public.tts_spend_hold_stale_after() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_held(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_held_approved(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_job_reserve(text, text, text, text[], bigint, boolean, bigint, integer, text, integer, bigint, integer, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_job_draw(bigint, text, text, integer, text, text, text, integer, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_job_release(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tts_spend_job_heartbeat(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tts_spend_hold_stale_after() TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_held(text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_held_approved(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_job_reserve(text, text, text, text[], bigint, boolean, bigint, integer, text, integer, bigint, integer, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_job_draw(bigint, text, text, integer, text, text, text, integer, text, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_job_release(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.tts_spend_job_heartbeat(bigint) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
