require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "preocupado", expanded_f: "preocupada", expanded_m: "preocupado" },
  { original: "pronto", expanded_f: "pronta", expanded_m: "pronto" },
  { original: "pronto para ir assim que quiseres", expanded_f: "pronta para ir assim que quiseres", expanded_m: "pronto para ir assim que quiseres" },
  { original: "pronto para ir no próximo autocarro", expanded_f: "pronta para ir no próximo autocarro", expanded_m: "pronto para ir no próximo autocarro" },
  { original: "pronto para ir para casa", expanded_f: "pronta para ir para casa", expanded_m: "pronto para ir para casa" },
  { original: "pronto para ter uma conversa", expanded_f: "pronta para ter uma conversa", expanded_m: "pronto para ter uma conversa" },
  { original: "próxima", expanded_f: "próxima", expanded_m: "próximo" },
  { original: "próximo", expanded_f: "próxima", expanded_m: "próximo" }
];

const rows = results.map(r => ({
  course_code: 'por_for_eng',
  original_text: r.original,
  language: 'por',
  expanded_f: r.expanded_f,
  expanded_m: r.expanded_m
}));

(async () => {
  try {
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await supabase.from('course_gender_expansions').upsert(
        rows.slice(i, i + 500)
      );
      if (error) {
        console.error('Insert error:', error.message);
        process.exit(1);
      }
    }
    console.log('\n✅ BATCH 32/36 COMPLETE');
    console.log('   Processed: 201 texts');
    console.log('   With variants: 8');
    console.log('   Without variants: 193');
    console.log('   Inserted: ' + rows.length + ' gender expansions');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();
