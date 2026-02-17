const { supabase } = require('./services/supabase-client.cjs');
const fs = require('fs');

async function deleteFlaggedPhrases() {
  // Read phrase IDs from file
  const phraseIds = fs.readFileSync('/tmp/flagged_ids.txt', 'utf8')
    .trim()
    .split('\n')
    .filter(id => id.length > 0);

  console.log(`Deleting ${phraseIds.length} flagged phrases...`);

  let deleted = 0;
  let failed = 0;

  for (const phraseId of phraseIds) {
    try {
      // Step 1: Delete or update flags that reference this phrase
      const { error: flagError } = await supabase
        .from('course_qa_flags')
        .delete()
        .eq('phrase_id', phraseId);

      if (flagError) {
        console.error(`Failed to delete flags for ${phraseId}:`, flagError.message);
        failed++;
        continue;
      }

      // Step 2: Delete the phrase
      const { error: phraseError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('id', phraseId);

      if (phraseError) {
        console.error(`Failed to delete phrase ${phraseId}:`, phraseError.message);
        failed++;
        continue;
      }

      deleted++;
      if (deleted % 20 === 0) {
        console.log(`Progress: ${deleted}/${phraseIds.length} deleted...`);
      }
    } catch (err) {
      console.error(`Error processing ${phraseId}:`, err.message);
      failed++;
    }
  }

  console.log('\n=== Deletion Complete ===');
  console.log(`Successfully deleted: ${deleted} phrases`);
  console.log(`Failed: ${failed} phrases`);
}

deleteFlaggedPhrases().catch(console.error);
