const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CHECK_SEEDS = [271, 273, 274, 276, 278, 279, 280];

(async () => {
  for (const sn of CHECK_SEEDS) {
    const { data: draft } = await supabase
      .from('course_seed_drafts')
      .select('submission_data, known_text, target_text')
      .eq('course_code', 'jpn_for_eng')
      .eq('seed_number', sn)
      .single();

    const sd = draft.submission_data;
    const legos = sd.legos || [];
    console.log(`\nS${sn}: "${draft.known_text}" -> "${draft.target_text}"`);
    for (const lego of legos) {
      const type = lego.type || '?';
      const hasComponents = lego.components && lego.components.length > 0;
      const buildCount = (lego.build || []).length;
      const useCount = (lego.use || []).length;
      console.log(`  L${lego.idx} (${type}): known="${lego.known}" target="${lego.target}" components=${hasComponents} build=${buildCount} use=${useCount}`);
      if (type === 'M' && !hasComponents) {
        console.log(`    WARNING: M-type without components!`);
      }
      if (buildCount < 3) {
        console.log(`    WARNING: Only ${buildCount} build phrases (need 3+)`);
      }
      if (useCount < 8) {
        console.log(`    WARNING: Only ${useCount} use phrases (need 8+)`);
      }
    }
  }
})();
