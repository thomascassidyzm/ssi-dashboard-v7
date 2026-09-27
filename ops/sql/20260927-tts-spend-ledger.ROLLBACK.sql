-- Rollback of 20260927-tts-spend-ledger.sql. DROPS THE LEDGER: export it first
-- (copy (select * from public.tts_spend_ledger) to stdout csv header) — it is
-- the only record of what was spent. With it gone every guarded door refuses
-- to render (fail closed) until the forward migration runs again.
begin;
drop function if exists public.tts_spend_verify_chain(text);
drop function if exists public.tts_spend_totals(text, integer);
drop function if exists public.tts_spend_trip(text, text, text, text);
drop function if exists public.tts_spend_settle(bigint, text, text);
drop function if exists public.tts_spend_reserve(text, text, integer, text, text, text, text, text, integer, text, integer, bigint, integer, bigint, integer, integer, jsonb);
drop function if exists public.tts_spend_insert(text, text, text, integer, text, text, text, text, text, integer, text, integer, text, text, timestamptz);
drop table if exists public.tts_spend_ledger;
drop function if exists public.tts_spend_ledger_immutable();
drop function if exists public.tts_spend_cycle_start(timestamptz, integer);
drop function if exists public.tts_spend_row_hash(text, bigint, timestamptz, text, text, integer, text);
drop table if exists public.tts_spend_trips;
drop table if exists public.tts_spend_limit_log;
commit;
notify pgrst, 'reload schema';
