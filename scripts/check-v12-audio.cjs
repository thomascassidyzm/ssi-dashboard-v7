const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  // Get Welsh audio from v12 audio_files table via text lookup
  const { data: textData } = await supabase
    .from('texts')
    .select('id')
    .eq('content', 'dw i isio');

  if (!textData || textData.length === 0) {
    console.log('Text not found');
    return;
  }

  const textId = textData[0].id;
  console.log('Text ID:', textId);

  const { data } = await supabase
    .from('audio_files')
    .select('id, s3_key, s3_bucket, voice_id')
    .eq('text_id', textId);

  console.log('\nV12 audio_files:');
  for (const row of data || []) {
    console.log('  ID (UUID):', row.id);
    console.log('  S3 Key:', row.s3_key);
    console.log('  S3 Bucket:', row.s3_bucket);
    console.log('  Voice ID:', row.voice_id);
    console.log('  UUID case:', row.id === row.id.toLowerCase() ? 'lowercase' : 'UPPERCASE');
    console.log('');
  }

  // Also check what bucket Chinese audio uses
  const { data: zhText } = await supabase
    .from('texts')
    .select('id')
    .eq('content', '我想');

  if (zhText && zhText.length > 0) {
    const { data: zhAudio } = await supabase
      .from('audio_files')
      .select('id, s3_key, s3_bucket')
      .eq('text_id', zhText[0].id);

    console.log('\nChinese audio (v12):');
    for (const row of zhAudio || []) {
      console.log('  S3 Bucket:', row.s3_bucket);
      console.log('  UUID case:', row.id === row.id.toLowerCase() ? 'lowercase' : 'UPPERCASE');
    }
  }
}

check().catch(console.error);
