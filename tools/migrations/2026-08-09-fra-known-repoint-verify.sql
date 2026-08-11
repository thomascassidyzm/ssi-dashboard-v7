\set ON_ERROR_STOP on
create temp table ca as
select id::text as id, role, regexp_replace(voice_id,'^xai_','') as voice,
       lower(regexp_replace(btrim(text),'\.$','')) as ntext, created_at, s3_key
from course_audio where course_code='fra_for_eng';
create index on ca(id); create index on ca(role, ntext, voice);
create temp table clone_win as
select distinct on (role, ntext) role, ntext, id from ca where voice='gfzdpspr5fdp'
order by role, ntext, created_at desc;
create index on clone_win(role, ntext);
analyze ca; analyze clone_win;

\echo '== A. residual stale build/use known rows with a clone twin available (must be 0) =='
select count(*) from course_practice_phrases p
join ca c on c.id=p.known_audio_id::text
join clone_win w on w.role=c.role and w.ntext=c.ntext
where p.course_code='fra_for_eng' and p.phrase_role in ('build','use') and c.voice<>'gfzdpspr5fdp';

\echo '== B. residual stale build/use rows with NO clone twin (the 66 blocked) =='
select count(*) from course_practice_phrases p
join ca c on c.id=p.known_audio_id::text
where p.course_code='fra_for_eng' and p.phrase_role in ('build','use') and c.voice<>'gfzdpspr5fdp'
  and not exists (select 1 from clone_win w where w.role=c.role and w.ntext=c.ntext);

\echo '== C. any build/use known row still on ANY non-clone voice, by voice =='
select c.voice, count(*) from course_practice_phrases p join ca c on c.id=p.known_audio_id::text
where p.course_code='fra_for_eng' and p.phrase_role in ('build','use') group by 1 order by 2 desc;

\echo '== D. the rows Tom hit live: seed 8 lego 2, build =='
select p.id, p.phrase_role, p.known_text, p.known_audio_id, c.voice, c.s3_key
from course_practice_phrases p left join ca c on c.id=p.known_audio_id::text
where p.course_code='fra_for_eng' and p.id like 'fra_for_eng:S0008L02%' order by p.id;

\echo '== E. anything anywhere still pointing at the Eve clip e5fbcd70 =='
select 'phrases.known' t, count(*) from course_practice_phrases where course_code='fra_for_eng' and known_audio_id='e5fbcd70-923c-41d9-98cb-2194625ad9f5'
union all select 'legos.known', count(*) from course_legos where course_code='fra_for_eng' and known_audio_id='e5fbcd70-923c-41d9-98cb-2194625ad9f5'
union all select 'seeds.known', count(*) from course_seeds where course_code='fra_for_eng' and known_audio_id='e5fbcd70-923c-41d9-98cb-2194625ad9f5';

\echo '== F. other courses untouched: build/use known rows updated in the last hour =='
select course_code, count(*) from course_practice_phrases
where updated_at > now() - interval '1 hour' group by 1 order by 2 desc;
