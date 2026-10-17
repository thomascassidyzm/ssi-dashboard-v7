-- Row counts of the tables the nightly QA reads, "name<TAB>count": the restore's sanity check.
SELECT 'course_seeds' AS t, count(*) FROM public.course_seeds
UNION ALL SELECT 'course_legos', count(*) FROM public.course_legos
UNION ALL SELECT 'course_practice_phrases', count(*) FROM public.course_practice_phrases
UNION ALL SELECT 'course_audio', count(*) FROM public.course_audio
UNION ALL SELECT 'courses', count(*) FROM public.courses;
