require('dotenv').config({ path: '.env.automation' });
const db = require('../services/supabase-client.cjs');

(async () => {
  await new Promise(r => setTimeout(r, 500));
  const supabase = db.getClient();
  if (!supabase) {
    console.log('Supabase not initialized');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('voices')
    .select('voice_id, tts_engine, type')
    .limit(30);

  if (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }

  console.log('Voices in database:', data?.length || 0);
  data?.forEach(v => console.log('  -', v.voice_id, '|', v.tts_engine, '|', v.type));

  // Also check if the specific voices exist
  console.log('\nChecking for specific voices:');
  const testVoices = [
    'en-GB-OllieMultilingualNeural',
    'zh-CN-XiaoxiaoMultilingualNeural',
    'zh-CN-YunxiaoMultilingualNeural'
  ];

  for (const vid of testVoices) {
    const voice = await db.getVoice(vid);
    console.log(`  ${vid}: ${voice ? 'FOUND' : 'NOT FOUND'}`);
  }

  process.exit(0);
})();
