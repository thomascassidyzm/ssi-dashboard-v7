-- Backfill text_normalized to canonical form matching normalizeForAudio():
-- lower, trim, collapse whitespace, strip trailing periods only
-- Preserves ! and ? (they affect TTS prosody)
update course_audio
set text_normalized = regexp_replace(
  lower(trim(regexp_replace(text, '\s+', ' ', 'g'))),
  '\.+$', '', 'g'
)
where text_normalized is distinct from regexp_replace(
  lower(trim(regexp_replace(text, '\s+', ' ', 'g'))),
  '\.+$', '', 'g'
);
