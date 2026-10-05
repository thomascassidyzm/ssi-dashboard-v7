-- HARD DAILY CEILING 300,000 -> 1,000,000 (job #859, Tom 2026-10-05 11:31Z, verbatim: "No. Stop being a slave to the daily
-- allowance. We are the boss of this. I pay for Cartesia." Earlier, 2026-10-04 23:58Z, he set 1M chars/day for the Italian run).
-- Only v_ceiling changes; the 260,000 automatic cap for unapproved work, per-call checks, per-provider caps/alerts, the Cartesia
-- monthly pool share, repeat stop and Tom stop are untouched. Built from the LIVE function (= 20261004-tts-spend-commissioned-jobs.sql).
-- Rollback: ops/sql/20261005-tts-spend-ceiling-1m.ROLLBACK.sql

begin;

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
  v_ceiling constant bigint := 1000000; v_approval record; v_approved_all bigint; v_approved_here bigint;
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

  select coalesce(sum(chars), 0) into v_today from public.tts_spend_ledger where provider = p_provider and at >= v_day;
  select coalesce(sum(chars), 0) into v_cycle from public.tts_spend_ledger where provider = p_provider and at >= v_cycle0;
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
  --   AUTOMATIC   every caller: 260,000 chars/UTC day across all providers, not
  --               counting what Tom-approved runs spent today (so his run never
  --               starves anyone else's automatic allowance).
  --   APPROVED    a call whose p_job matches a signed approval row
  --               (tts_spend_total_cap_raises.job = '#NNN', by Tom, dated) spends
  --               from that job's own allowance, cap_chars, never above 300,000.
  --   CEILING     nothing, approved or not, takes the day past 300,000 in total.
  -- An approval row is written only by tools/tts-cap.cjs approve, on Tom's word.
  select coalesce(sum(chars), 0) into v_total from public.tts_spend_ledger where kind = 'call' and at >= v_day;
  select coalesce(max(cap_chars), 0) into v_raised from public.tts_spend_total_cap_raises
   where job is null and by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days';
  select coalesce(sum(l.chars), 0) into v_approved_all from public.tts_spend_ledger l
   where l.kind = 'call' and l.at >= v_day and l.job is not null and exists (
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
    select coalesce(sum(chars), 0) into v_approved_here from public.tts_spend_ledger
     where kind = 'call' and at >= v_day and job ~ (v_approval.job || '(?![0-9])');
    v_total_cap := least(v_approval.cap_chars, v_ceiling);
    if v_approved_here + p_chars > v_total_cap then
      return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen, 'total', v_approved_here, 'cap', v_total_cap,
        'message', format('Tom-approved run %s has spent %s chars today; this call (%s) would pass its approval of %s (by %s, until %s; UTC day). Do not retry and do not split the job', v_approval.job, v_approved_here, p_chars, v_total_cap, v_approval.by, v_approval.until));
    end if;
  elsif coalesce((p_limits->>'commissioned')::boolean, false) then
    null; -- a live commissioned job (job #661): only the 300,000 ceiling above stops it
  else
    v_total_cap := least(v_ceiling, greatest(260000, v_raised));
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
end $function$;

commit;
notify pgrst, 'reload schema';
