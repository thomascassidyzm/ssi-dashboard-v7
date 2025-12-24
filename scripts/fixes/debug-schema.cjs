/**
 * Debug database schema
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function debug() {
  console.log('=== Database Schema Debug ===\n');

  // Get audio_files columns
  console.log('1. audio_files table:');
  const { data: af } = await supabase.from('audio_files').select('*').limit(1);
  if (af?.length) {
    console.log('  Columns:', Object.keys(af[0]).join(', '));
    console.log('  Sample:', JSON.stringify(af[0], null, 2));
  }

  // Get texts table columns
  console.log('\n2. texts table:');
  const { data: texts } = await supabase.from('texts').select('*').limit(1);
  if (texts?.length) {
    console.log('  Columns:', Object.keys(texts[0]).join(', '));
    console.log('  Sample:', JSON.stringify(texts[0], null, 2));
  }

  // Get course_audio columns
  console.log('\n3. course_audio table:');
  const { data: ca } = await supabase.from('course_audio').select('*').eq('course_code', 'zho_for_eng').limit(1);
  if (ca?.length) {
    console.log('  Columns:', Object.keys(ca[0]).join(', '));
    console.log('  Sample:', JSON.stringify(ca[0], null, 2));
  }

  // Check if audio_files has text_id linking to texts
  console.log('\n4. Looking for text-audio relationship...');

  // Check audio_files with text_id
  const { data: afWithText } = await supabase
    .from('audio_files')
    .select('id, text_id, s3_key, s3_bucket')
    .not('text_id', 'is', null)
    .limit(3);

  if (afWithText?.length) {
    console.log('  audio_files with text_id:');
    for (const row of afWithText) {
      console.log(`    ${row.id} -> text_id: ${row.text_id}`);

      // Get the text
      const { data: textData } = await supabase
        .from('texts')
        .select('*')
        .eq('id', row.text_id)
        .single();

      if (textData) {
        console.log(`      Text columns:`, Object.keys(textData).join(', '));
        console.log(`      Content:`, JSON.stringify(textData));
      }
    }
  }

  // Try to find audio for our test phrase via texts
  console.log('\n5. Finding audio for "我要说整个句子":');
  const targetText = '我要说整个句子';

  // First find the text_id
  const { data: textMatch } = await supabase
    .from('texts')
    .select('*')
    .eq('content', targetText)
    .limit(1);

  if (textMatch?.length) {
    console.log('  Found text:', textMatch[0]);

    // Now find audio_files with this text_id
    const { data: audioMatch } = await supabase
      .from('audio_files')
      .select('*')
      .eq('text_id', textMatch[0].id)
      .limit(1);

    if (audioMatch?.length) {
      console.log('  Found audio:', audioMatch[0]);
    } else {
      console.log('  No audio_files found for this text_id');
    }
  } else {
    console.log('  Text not found in texts table');

    // Try with normalized/lowercase
    const { data: textMatch2 } = await supabase
      .from('texts')
      .select('*')
      .ilike('content', targetText)
      .limit(1);

    if (textMatch2?.length) {
      console.log('  Found with ilike:', textMatch2[0]);
    }
  }
}

debug().catch(console.error);
