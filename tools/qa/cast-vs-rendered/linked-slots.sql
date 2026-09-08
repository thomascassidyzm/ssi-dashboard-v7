with links as (
  select course_code, 'known'::text role, known_audio_id id from course_practice_phrases where known_audio_id is not null
  union all select course_code, 'target1', target1_audio_id from course_practice_phrases where target1_audio_id is not null
  union all select course_code, 'target2', target2_audio_id from course_practice_phrases where target2_audio_id is not null
  union all select course_code, 'presentation', presentation_audio_id from course_practice_phrases where presentation_audio_id is not null
  union all select course_code, 'known', known_audio_id from course_seeds where known_audio_id is not null
  union all select course_code, 'target1', target1_audio_id from course_seeds where target1_audio_id is not null
  union all select course_code, 'target2', target2_audio_id from course_seeds where target2_audio_id is not null
)
select l.course_code, l.role, a.voice_id, a.origin, count(*) n
from links l join course_audio a on a.id = l.id
group by 1,2,3,4;
