-- THE TTS SPEND LEDGER, in the one shared database (job #430, hardening #425).
--
-- Why here and not a file: #425 put the ledger in a JSONL on each host and did
-- check-then-append, so (a) two hosts each saw half the spend and (b) two
-- workers on one host could both pass the check before either appended. The
-- #382 drain was 7.63M Cartesia characters; a budget that one extra host or
-- one race can double is not a budget. Every paid TTS attempt, on every host,
-- now RESERVES here first, in one statement, under a per-provider advisory
-- lock: the caps and the repeat limit are checked and the row inserted in the
-- same transaction, so concurrent callers queue and cannot overshoot.
--
-- services/shared/tts-spend-guard.cjs calls these over PostgREST with the
-- service-role key. ADDITIVE ONLY. Rollback: 20260927-tts-spend-ledger.ROLLBACK.sql.

begin;

create table if not exists public.tts_spend_ledger (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),   -- the DB's clock, never the caller's
  kind         text        not null check (kind in ('call', 'seed')),
  provider     text        not null,
  voice        text,
  chars        integer     not null check (chars >= 0),
  repeat_key   text,
  text_hash    text,
  course       text,
  job          text,
  language     text,
  attempt      integer,
  host         text,
  pid          integer,
  status       text        not null default 'reserved' check (status in ('reserved', 'sent', 'failed', 'seed')),
  settled_at   timestamptz,
  note         text,
  prev_hash    text,
  row_hash     text        not null
);
-- Covering index: the day / cycle sums are index-only scans.
create index if not exists tts_spend_ledger_provider_at on public.tts_spend_ledger (provider, at) include (chars);
create index if not exists tts_spend_ledger_key_at on public.tts_spend_ledger (repeat_key, at) where repeat_key is not null;

-- A provider stopped by a human-readable reason (provider-vs-ledger divergence,
-- the provider's own usage past the stop). One row stops that provider on every
-- host until a human deletes it.
create table if not exists public.tts_spend_trips (
  provider  text primary key,
  code      text not null,
  message   text not null,
  at        timestamptz not null default now(),
  host      text
);

-- Every change in the limits a caller brings, per provider, from any host.
create table if not exists public.tts_spend_limit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  provider  text not null,
  host      text,
  limits    jsonb not null,
  limits_hash text not null
);

-- New tables arrive grant-open to anon on this project: close them. RLS on with
-- NO policy = nobody but service_role (which bypasses RLS).
revoke all on public.tts_spend_ledger, public.tts_spend_trips, public.tts_spend_limit_log from public, anon, authenticated;
-- The ledger is append-only even for service_role: no DELETE, no TRUNCATE.
grant select, insert, update on public.tts_spend_ledger, public.tts_spend_limit_log to service_role;
-- Supabase's default privileges hand new tables ALL to service_role before this
-- grant runs (seen live, job #440): take DELETE and TRUNCATE back explicitly so
-- the grants say what the trigger enforces.
revoke delete, truncate on public.tts_spend_ledger, public.tts_spend_limit_log from service_role;
grant all on public.tts_spend_trips to service_role;   -- a human clears a trip by deleting its row
revoke all on sequence public.tts_spend_ledger_id_seq, public.tts_spend_limit_log_id_seq from public, anon, authenticated;
grant usage, select on sequence public.tts_spend_ledger_id_seq, public.tts_spend_limit_log_id_seq to service_role;
alter table public.tts_spend_ledger enable row level security;
alter table public.tts_spend_trips enable row level security;
alter table public.tts_spend_limit_log enable row level security;

-- TAMPER-EVIDENT: each row's hash covers its own money fields and the previous
-- row's hash for the same provider (computed under the provider lock). The
-- money fields can never be updated and rows can never be deleted; only the
-- settlement columns change. tts_spend_verify_chain() names the first break.
create or replace function public.tts_spend_row_hash(p_prev text, p_id bigint, p_at timestamptz, p_kind text, p_provider text, p_chars integer, p_key text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select encode(sha256(convert_to(concat_ws('|', coalesce(p_prev, ''), p_id::text,
    to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), p_kind, p_provider, p_chars::text, coalesce(p_key, '')), 'UTF8')), 'hex')
$$;

create or replace function public.tts_spend_ledger_immutable()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'tts_spend_ledger is never truncated';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'tts_spend_ledger rows are never deleted (row %)', old.id;
  end if;
  if new.id is distinct from old.id or new.at is distinct from old.at or new.kind is distinct from old.kind
     or new.provider is distinct from old.provider or new.chars is distinct from old.chars
     or new.repeat_key is distinct from old.repeat_key or new.prev_hash is distinct from old.prev_hash
     or new.row_hash is distinct from old.row_hash then
    raise exception 'tts_spend_ledger money fields are immutable (row %); only status/settled_at/note may change', old.id;
  end if;
  return new;
end $$;
drop trigger if exists tts_spend_ledger_immutable on public.tts_spend_ledger;
create trigger tts_spend_ledger_immutable before update or delete on public.tts_spend_ledger
  for each row execute function public.tts_spend_ledger_immutable();
drop trigger if exists tts_spend_ledger_no_truncate on public.tts_spend_ledger;
create trigger tts_spend_ledger_no_truncate before truncate on public.tts_spend_ledger
  for each statement execute function public.tts_spend_ledger_immutable();

-- The start (UTC) of the billing cycle containing p_at for a pool resetting on p_day.
create or replace function public.tts_spend_cycle_start(p_at timestamptz, p_day integer)
returns timestamptz language sql immutable set search_path = public, pg_temp as $$
  select case
    when extract(day from p_at at time zone 'UTC') >= greatest(1, least(28, coalesce(p_day, 1)))
      then (date_trunc('month', p_at at time zone 'UTC') + make_interval(days => greatest(1, least(28, coalesce(p_day, 1))) - 1)) at time zone 'UTC'
    else (date_trunc('month', p_at at time zone 'UTC') - interval '1 month' + make_interval(days => greatest(1, least(28, coalesce(p_day, 1))) - 1)) at time zone 'UTC'
  end
$$;

-- Insert one row, chained to the provider's previous row. Caller holds the lock.
create or replace function public.tts_spend_insert(p_kind text, p_provider text, p_voice text, p_chars integer, p_key text,
  p_text_hash text, p_course text, p_job text, p_language text, p_attempt integer, p_host text, p_pid integer, p_status text, p_note text, p_at timestamptz)
returns bigint language plpgsql set search_path = public, pg_temp as $$
declare v_prev text; v_id bigint;
begin
  select row_hash into v_prev from public.tts_spend_ledger where provider = p_provider order by id desc limit 1;
  v_id := nextval(pg_get_serial_sequence('public.tts_spend_ledger', 'id'));
  insert into public.tts_spend_ledger (id, at, kind, provider, voice, chars, repeat_key, text_hash, course, job, language, attempt, host, pid, status, note, prev_hash, row_hash)
  overriding system value
  values (v_id, p_at, p_kind, p_provider, p_voice, p_chars, p_key, p_text_hash, p_course, p_job, p_language, p_attempt, p_host, p_pid, p_status, p_note, v_prev,
          public.tts_spend_row_hash(v_prev, v_id, p_at, p_kind, p_provider, p_chars, p_key));
  return v_id;
end $$;

/*
 * RESERVE — the one call every paid attempt makes before it is sent.
 * Atomic: a transaction-scoped advisory lock per provider serialises the
 * check and the insert, so N concurrent callers on any number of hosts see
 * each other's reservations. Returns jsonb:
 *   { ok: true,  id, today, cycle, seen }                  — reserved; send it
 *   { ok: false, code, message, today, cycle, seen }       — refused; do not send
 * Limits come from the caller (the guard validates them against the committed
 * baseline); any change in them is written to tts_spend_limit_log.
 */
create or replace function public.tts_spend_reserve(
  p_provider text, p_voice text, p_chars integer, p_repeat_key text, p_text_hash text,
  p_course text, p_job text, p_language text, p_attempt integer, p_host text, p_pid integer,
  p_daily_cap bigint, p_cycle_start_day integer, p_cycle_cap bigint, p_repeat_max integer, p_repeat_window_hours integer,
  p_limits jsonb default null)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_day    timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_cycle0 timestamptz := public.tts_spend_cycle_start(v_now, p_cycle_start_day);
  v_today  bigint; v_cycle bigint; v_seen integer := 0; v_trip record; v_id bigint; v_hash text; v_last text;
begin
  if p_provider is null or p_chars is null or p_chars < 0 then
    return jsonb_build_object('ok', false, 'code', 'BAD_CALL', 'message', 'provider and a non-negative chars are required');
  end if;
  if p_daily_cap is null or p_cycle_cap is null or p_repeat_max is null or p_repeat_window_hours is null then
    return jsonb_build_object('ok', false, 'code', 'NO_LIMITS', 'message', 'a reservation must carry its limits — refusing an unbounded call');
  end if;

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
end $$;

-- SETTLE — record what happened to a reservation. The chars stay counted
-- whatever the outcome: a failed attempt may still have been billed.
create or replace function public.tts_spend_settle(p_id bigint, p_status text, p_note text default null)
returns void language sql set search_path = public, pg_temp as $$
  update public.tts_spend_ledger set status = p_status, settled_at = clock_timestamp(), note = coalesce(p_note, note)
   where id = p_id and status = 'reserved' and p_status in ('sent', 'failed')
$$;

-- TRIP — stop a provider on every host.
create or replace function public.tts_spend_trip(p_provider text, p_code text, p_message text, p_host text default null)
returns void language sql set search_path = public, pg_temp as $$
  insert into public.tts_spend_trips (provider, code, message, host) values (p_provider, p_code, p_message, p_host)
  on conflict (provider) do nothing
$$;

-- Read-only totals for a status line or a driver.
create or replace function public.tts_spend_totals(p_provider text, p_cycle_start_day integer default 1)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'provider', p_provider,
    'today', (select coalesce(sum(chars), 0) from public.tts_spend_ledger where provider = p_provider
               and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'),
    'cycle', (select coalesce(sum(chars), 0) from public.tts_spend_ledger where provider = p_provider
               and at >= public.tts_spend_cycle_start(now(), p_cycle_start_day)),
    'cycle_start', public.tts_spend_cycle_start(now(), p_cycle_start_day),
    'tripped', (select to_jsonb(t) from public.tts_spend_trips t where t.provider = p_provider))
$$;

-- The first row whose hash does not follow from its predecessor, or null.
create or replace function public.tts_spend_verify_chain(p_provider text)
returns bigint language plpgsql stable set search_path = public, pg_temp as $$
declare r record; v_prev text := null;
begin
  for r in select * from public.tts_spend_ledger where provider = p_provider order by id loop
    if r.prev_hash is distinct from v_prev
       or r.row_hash <> public.tts_spend_row_hash(r.prev_hash, r.id, r.at, r.kind, r.provider, r.chars, r.repeat_key) then
      return r.id;
    end if;
    v_prev := r.row_hash;
  end loop;
  return null;
end $$;

-- Functions: service_role only.
revoke all on function public.tts_spend_row_hash(text, bigint, timestamptz, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.tts_spend_cycle_start(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.tts_spend_insert(text, text, text, integer, text, text, text, text, text, integer, text, integer, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.tts_spend_reserve(text, text, integer, text, text, text, text, text, integer, text, integer, bigint, integer, bigint, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.tts_spend_settle(bigint, text, text) from public, anon, authenticated;
revoke all on function public.tts_spend_trip(text, text, text, text) from public, anon, authenticated;
revoke all on function public.tts_spend_totals(text, integer) from public, anon, authenticated;
revoke all on function public.tts_spend_verify_chain(text) from public, anon, authenticated;
grant execute on function public.tts_spend_reserve(text, text, integer, text, text, text, text, text, integer, text, integer, bigint, integer, bigint, integer, integer, jsonb) to service_role;
grant execute on function public.tts_spend_settle(bigint, text, text) to service_role;
grant execute on function public.tts_spend_trip(text, text, text, text) to service_role;
grant execute on function public.tts_spend_totals(text, integer) to service_role;
grant execute on function public.tts_spend_verify_chain(text) to service_role;
grant execute on function public.tts_spend_row_hash(text, bigint, timestamptz, text, text, integer, text) to service_role;
grant execute on function public.tts_spend_cycle_start(timestamptz, integer) to service_role;
grant execute on function public.tts_spend_insert(text, text, text, integer, text, text, text, text, text, integer, text, integer, text, text, timestamptz) to service_role;

-- SEED: September 2026's Cartesia spend before this ledger existed, so the
-- monthly stop is right the day it deploys. 7,631,695 characters is the #382
-- loop alone (phonology-deferred/eng_for_hin.jsonl, counted in job #425); any
-- other Cartesia spend this cycle is NOT in it. Dated 2026-09-26 12:00Z, the
-- loop's midpoint.
-- GAP: the Cartesia pool's actual reset day is not known to this repo;
-- cycleStartDay is 1 until someone reads it off the Cartesia dashboard.
do $$
begin
  if not exists (select 1 from public.tts_spend_ledger where kind = 'seed' and provider = 'cartesia' and note like 'seed:2026-09%') then
    perform pg_advisory_xact_lock(hashtext('tts_spend:cartesia'));
    perform public.tts_spend_insert('seed', 'cartesia', null, 7631695, null, null, 'eng_for_hin', '#382 fill loop (counted by job #425)',
      null, null, 'migration', null, 'seed', 'seed:2026-09 Cartesia spend before the ledger existed (#382 loop, 2026-09-25 22:33Z to 2026-09-26 20:47Z)',
      '2026-09-26 12:00:00+00');
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
