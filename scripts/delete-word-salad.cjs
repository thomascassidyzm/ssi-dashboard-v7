require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ids = ["f708b169-9038-4ba6-a1a3-0182d215b9cb","ccc654e2-832e-440e-9e3a-9ef2ae73e27f","904520a9-9b35-4464-ae8b-737da5dfa504","055eaacf-e7ed-461e-a1c8-545b951bad4b","1c38a9b7-33a9-4a42-896e-3d5cf5bb71e5","f5b5d0cb-f866-4aa2-808e-c3ac719afd8a","6e6779a3-21f1-431c-9d76-75162f08b02f","49563a5a-d5e8-4f8e-8ce2-51193fe3704f","478b3bb3-e81e-4449-844a-fa74cc9f32b8","2c13df65-4e66-46a6-93d2-f0ffba87058e","47792735-5c1e-474f-85cf-c3bbdf0dc79d","73602a5d-915b-44dd-8de9-6efb1424c6cf","21307b91-39b5-4bf9-b17e-43dc0e084934","c3dec864-484b-45e0-abd3-8bb0742f9bab","2e36b867-efbf-4cd8-968b-5f4d09a130c1"];

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', ids)
    .select('target_text');
  
  if (error) console.log('Error:', error);
  else {
    console.log('Deleted', data.length, 'garbage phrases:');
    data.forEach(p => console.log('  ✓', p.target_text.substring(0, 50) + '...'));
  }
}
main();
