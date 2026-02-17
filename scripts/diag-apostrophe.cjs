const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check a specific missing phrase
  const testText = "i feel as if i'm doing worse today than yesterday";

  // Search for it in phrase table
  const { data: phrase } = await sb.from('course_practice_phrases')
    .select('known_text')
    .eq('course_code', 'nld_for_eng')
    .ilike('known_text', '%i feel as if%doing worse%')
    .limit(1);

  // Search for it in audio table
  const { data: audio } = await sb.from('course_audio')
    .select('text, text_normalized')
    .eq('course_code', 'nld_for_eng')
    .eq('role', 'known')
    .ilike('text_normalized', '%i feel as if%doing worse%')
    .limit(1);

  if (phrase && phrase[0]) {
    const pt = phrase[0].known_text;
    console.log('Phrase text:', JSON.stringify(pt));
    console.log('Phrase chars:', [...pt].map(c => `${c} (U+${c.charCodeAt(0).toString(16).padStart(4,'0')})`).filter(c => c.includes("'") || c.charCodeAt(0) > 127).join(', '));
    // Show chars around apostrophe
    const idx = pt.indexOf("'") !== -1 ? pt.indexOf("'") : pt.indexOf("\u2019");
    if (idx >= 0) console.log('Apostrophe area:', [...pt.slice(Math.max(0,idx-2), idx+3)].map(c => `${c}=U+${c.charCodeAt(0).toString(16).padStart(4,'0')}`).join(' '));
  } else {
    console.log('Phrase not found');
  }

  if (audio && audio[0]) {
    const at = audio[0].text_normalized;
    console.log('\nAudio text_normalized:', JSON.stringify(at));
    const idx = at.indexOf("'") !== -1 ? at.indexOf("'") : at.indexOf("\u2019");
    if (idx >= 0) console.log('Apostrophe area:', [...at.slice(Math.max(0,idx-2), idx+3)].map(c => `${c}=U+${c.charCodeAt(0).toString(16).padStart(4,'0')}`).join(' '));
  } else {
    console.log('\nAudio not found for this text');
    // Try broader search
    const { data: broader } = await sb.from('course_audio')
      .select('text, text_normalized')
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'known')
      .ilike('text', '%doing worse%')
      .limit(3);
    if (broader) {
      for (const b of broader) {
        console.log('Broader match:', JSON.stringify(b.text_normalized));
        const idx2 = [...b.text_normalized].findIndex(c => c.charCodeAt(0) === 0x27 || c.charCodeAt(0) === 0x2019);
        if (idx2 >= 0) {
          console.log('  Apos:', [...b.text_normalized.slice(Math.max(0,idx2-1), idx2+2)].map(c => `${c}=U+${c.charCodeAt(0).toString(16).padStart(4,'0')}`).join(' '));
        }
      }
    }
  }
})();
