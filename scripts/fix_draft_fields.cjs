const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BAD_SEEDS = [271, 273, 274, 276, 278, 279, 280];

(async () => {
  for (const sn of BAD_SEEDS) {
    // Load draft
    const { data: draft, error: loadErr } = await supabase
      .from('course_seed_drafts')
      .select('submission_data')
      .eq('course_code', 'jpn_for_eng')
      .eq('seed_number', sn)
      .single();

    if (loadErr) { console.log(`S${sn}: load error - ${loadErr.message}`); continue; }

    const sd = draft.submission_data;
    const legos = sd.legos || [];

    // Fix field names
    const fixedLegos = legos.map(lego => {
      const fixed = { ...lego };
      if (lego.lego_known && !lego.known) {
        fixed.known = lego.lego_known;
        delete fixed.lego_known;
      }
      if (lego.lego_target && !lego.target) {
        fixed.target = lego.lego_target;
        delete fixed.lego_target;
      }
      if (lego.lego_type && !lego.type) {
        fixed.type = lego.lego_type;
        delete fixed.lego_type;
      }
      return fixed;
    });

    // Update submission_data
    const fixedSd = { ...sd, legos: fixedLegos };

    const { error: updateErr } = await supabase
      .from('course_seed_drafts')
      .update({ submission_data: fixedSd })
      .eq('course_code', 'jpn_for_eng')
      .eq('seed_number', sn);

    if (updateErr) {
      console.log(`S${sn}: update error - ${updateErr.message}`);
    } else {
      console.log(`S${sn}: FIXED - ${fixedLegos.length} legos, known=${fixedLegos[0]?.known}, target=${fixedLegos[0]?.target}`);
    }
  }
  console.log('Done');
})();
