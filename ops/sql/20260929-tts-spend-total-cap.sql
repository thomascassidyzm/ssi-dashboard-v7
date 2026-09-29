-- THE DAILY TOTAL CAP: 50,000 characters per UTC day across every provider,
-- caller and person, enforced inside tts_spend_reserve in the shared ledger
-- (job #692, Tom 2026-09-29 00:25Z: "allow Audio back on, but limit it to 50,000
-- characters per day TOTAL without my express approval").  The base figure lives
-- in the function; a raise is a row in tts_spend_total_cap_raises naming Tom, with
-- a reason and a date at most 31 days out (tools/tts-cap.cjs raise).  Built from
-- the LIVE function definition (which is 20260928-tts-spend-tom-stop.sql); the
-- '*' stop check is untouched and still first.
-- Rollback: re-run the tts_spend_reserve block of 20260928-tts-spend-tom-stop.sql.

begin;

create table if not exists public.tts_spend_total_cap_raises (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  cap_chars bigint not null check (cap_chars > 0),
  by        text not null,
  why       text not null,
  until     timestamptz not null
);
revoke all on public.tts_spend_total_cap_raises from public, anon, authenticated;
grant select, insert on public.tts_spend_total_cap_raises to service_role;
revoke all on sequence public.tts_spend_total_cap_raises_id_seq from public, anon, authenticated;
grant usage, select on sequence public.tts_spend_total_cap_raises_id_seq to service_role;
alter table public.tts_spend_total_cap_raises enable row level security;

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

  select coalesce(sum(chars), 0) into v_total from public.tts_spend_ledger where kind = 'call' and at >= v_day;
  select coalesce(max(cap_chars), 0) into v_raised from public.tts_spend_total_cap_raises
   where by ~* '^\s*tom\M' and nullif(btrim(why), '') is not null and until > v_now and until <= at + interval '31 days';
  v_total_cap := greatest(50000, v_raised);
  if v_total + p_chars > v_total_cap then
    return jsonb_build_object('ok', false, 'code', 'DAILY_TOTAL_CAP', 'today', v_today, 'cycle', v_cycle, 'seen', v_seen, 'total', v_total, 'cap', v_total_cap,
      'message', format('daily audio cap reached; only Tom can approve more (%s chars spent today across all providers, this call is %s, the cap is %s; UTC day). Do not retry and do not split the job', v_total, p_chars, v_total_cap));
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
