const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get a few presentation_audio_ids from LEGOs
  const { data: legos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, presentation_audio_id')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .not('presentation_audio_id', 'is', null)
    .order('seed_number')
    .limit(5);

  console.log('LEGO presentation_audio_ids:');
  for (const l of legos) {
    console.log(`  S${l.seed_number}L${l.lego_index}: ${l.presentation_audio_id}`);
  }

  // Try to find these in course_audio by searching s3_key
  const ids = legos.map(l => l.presentation_audio_id);

  // Are they S3 UUIDs? Try matching against s3_key
  for (const id of ids.slice(0, 3)) {
    const upper = id.toUpperCase();
    const { data: byS3 } = await sb
      .from('course_audio')
      .select('id, s3_key, role, lego_id, text_content')
      .eq('course_code', 'jpn_for_eng')
      .like('s3_key', `%${upper}%`)
      .limit(1);

    if (byS3 && byS3.length > 0) {
      console.log(`\n  ${id} is S3 UUID!`);
      console.log(`    DB id: ${byS3[0].id}`);
      console.log(`    s3_key: ${byS3[0].s3_key}`);
      console.log(`    role: ${byS3[0].role}`);
      console.log(`    lego_id: ${byS3[0].lego_id}`);
      console.log(`    text: ${(byS3[0].text_content || '').substring(0, 60)}`);
    } else {
      // Try lowercase
      const { data: byS3Lower } = await sb
        .from('course_audio')
        .select('id, s3_key, role, lego_id')
        .eq('course_code', 'jpn_for_eng')
        .like('s3_key', `%${id}%`)
        .limit(1);

      if (byS3Lower && byS3Lower.length > 0) {
        console.log(`\n  ${id} found via lowercase s3_key match`);
        console.log(`    DB id: ${byS3Lower[0].id}`);
      } else {
        console.log(`\n  ${id} NOT found in s3_key either`);
      }
    }
  }

  // Count presentation audio records that exist
  const { data: presAudio } = await sb
    .from('course_audio')
    .select('id, lego_id, seed_number, lego_index')
    .eq('course_code', 'jpn_for_eng')
    .eq('role', 'presentation')
    .order('seed_number')
    .limit(5);

  console.log('\n\nActual presentation audio records in course_audio:');
  for (const a of (presAudio || [])) {
    console.log(`  DB id: ${a.id}  lego: ${a.lego_id} (S${a.seed_number}L${a.lego_index})`);
  }
})();
