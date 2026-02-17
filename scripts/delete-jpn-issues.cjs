require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const idsToDelete = [
  // Placeholders
  'dfe11c10-2fae-4716-a757-a25a9aa3c6e5',  // 私は〜したいです。
  'f6047c53-9e1d-4337-89cf-1da955d1ff52',  // 〜したいです。
  
  // Dropped adverbs (とても/本当に)
  'ae8e6602-36e2-4ffa-9e0d-199d35d9477d',  // とてもしたいです。
  '0b8d691a-2c3e-4455-9a2f-88118722cd71',  // 本当にしたいです。
  '03e9b516-062d-4efc-ad54-bd3006d95da7',  // とても話したいです。
  '7554420a-6009-4232-af08-f03b0e195fc3',  // 本当に話したいです。
  '1eae4141-030a-4529-a455-59b65a9734aa',  // とても英語を話したいです。
  'f692a63b-8416-494b-a96c-6b923599d635',  // 本当に英語を話したいです。
  
  // Unnatural Japanese (〜ことがしたい)
  '3b02124d-4b02-4ff5-9cd6-0e1df46754f0',  // 話すことがしたいです。
  'e016409d-1a1f-4cfe-ac66-8afe63486c91',  // 英語を話すことがしたいです。
  '6391ef1a-8f9d-489b-a19a-abeb8df13277',  // あなたと話すことがしたいです。
  'd77e33ba-8e31-4980-9161-791e804e557b',  // あなたと英語を話すことがしたいです。
  
  // Incomplete "how to say"
  'ae168cc5-06ec-4473-8bc3-b5bdc4f1c116',  // 言う方法を学びたいです。
  'a4bbcdd2-da5d-428e-bbad-7bb410ebc222',  // 言う方法を学ぼうとしています。
];

async function main() {
  console.log('Deleting', idsToDelete.length, 'problematic phrases from eng_for_jpn...\n');
  
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', idsToDelete)
    .select('id, known_text, target_text');
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Deleted', data.length, 'phrases:');
    data.forEach(p => console.log('  ✓', p.known_text, '/', p.target_text));
  }
}
main();
