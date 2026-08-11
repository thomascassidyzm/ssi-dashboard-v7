-- Rollback for 20260811_record_full_max_seed.sql
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_record_full_max_seed_nonneg;
ALTER TABLE public.courses DROP COLUMN IF EXISTS record_full_max_seed;
