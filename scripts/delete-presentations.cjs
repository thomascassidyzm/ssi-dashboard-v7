require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  let total = 0
  while (true) {
    const { data } = await sb.from('course_audio')
      .select('id')
      .eq('course_code', 'deu_for_eng')
      .eq('role', 'presentation')
      .limit(200)
    if (!data || data.length === 0) break
    const ids = data.map(r => r.id)
    const { error } = await sb.from('course_audio').delete().in('id', ids)
    if (error) { console.log('Error:', error.message); break }
    total += ids.length
    console.log('Deleted batch of', ids.length, '- total:', total)
  }
  console.log('Done. Total deleted:', total)
}
run()
