const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CHECK_SEEDS = [271, 273, 274, 276, 278, 279, 280];

(async () => {
  for (const sn of CHECK_SEEDS) {
    const { data: draft } = await supabase
      .from('course_seed_drafts')
      .select('submission_data')
      .eq('course_code', 'jpn_for_eng')
      .eq('seed_number', sn)
      .single();

    const legos = draft.submission_data.legos || [];
    for (const lego of legos) {
      // Check build phrases
      for (const p of (lego.build || [])) {
        if (!p.known || !p.target) {
          console.log(`S${sn} L${lego.idx} BUILD: missing known/target - keys=${Object.keys(p)}`);
        }
      }
      // Check use phrases
      for (const p of (lego.use || [])) {
        if (!p.known || !p.target) {
          console.log(`S${sn} L${lego.idx} USE: missing known/target - keys=${Object.keys(p)}`);
        }
        if (!p.score && p.score !== 0) {
          console.log(`S${sn} L${lego.idx} USE: missing score - known="${p.known}"`);
        }
      }
    }
  }
  console.log('Done - all phrase formats checked');
})();
