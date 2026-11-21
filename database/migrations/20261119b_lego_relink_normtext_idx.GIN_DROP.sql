-- cs #950: only if the GIN build left idx_cpp_decomposition_path INVALID — drop it so the build can be retried.
SET lock_timeout = '10s';
SET statement_timeout = '10min';
DROP INDEX CONCURRENTLY IF EXISTS public.idx_cpp_decomposition_path;
