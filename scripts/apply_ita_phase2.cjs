#!/usr/bin/env node
/**
 * Apply Phase 2 Conflict Resolution updates for ita_for_eng
 * Verified upchunks using actual adjacent words from seeds
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// All verified upchunks
const updates = [
  // "what" conflict - S0008 wins with "quello che"
  { id: 'c94f6784-1ba2-4302-a72e-d333946a87cd', known_text: 'what are you looking for', target_text: 'cosa cerchi' },
  { id: 'a4a20b54-3861-4f0b-9a74-aa2469c80ddf', known_text: 'what do you think', target_text: 'cosa pensi' },
  { id: '8a22a034-e4e1-4478-8b66-365100832243', known_text: 'what do you need', target_text: 'cosa devi' },
  { id: '75c3c7d1-d58f-407f-ad9f-a9dd62ea7388', known_text: 'what do you want to do', target_text: 'cosa vuoi fare' },
  { id: '2860509d-3708-4845-9f63-6a18cec0b3a0', known_text: 'what are you going to do', target_text: 'cosa farai' },
  { id: 'a9ae8e9e-5f91-4134-ac12-f68e29bab9cb', known_text: 'what was going to happen', target_text: 'cosa sarebbe successo' },
  { id: '3c7c2a33-8d57-4fb2-ae90-dc1bb1847953', known_text: 'what would you do', target_text: 'cosa faresti' },
  { id: 'e17f0e1b-389d-4c8d-b465-842b955d3b97', known_text: "what they're trying to achieve", target_text: 'cosa stanno cercando di ottenere' },

  // "answer" conflict - S0017 wins with noun "risposta"
  { id: '351f95f4-5675-4511-b7d4-306228b36821', known_text: "couldn't answer", target_text: 'non potevo rispondere' },
  { id: '149719b3-8835-4ab3-bb7d-36cb5ee3bf43', known_text: "couldn't answer", target_text: 'non potevo rispondere' },

  // "to meet" conflict - S0018 wins with "incontrarci"
  { id: '2845e0b4-a947-4df7-904e-eefbdfa4f676', known_text: 'to meet people', target_text: 'conoscere persone' },

  // "speak" conflict - S0022 wins with "parlano"
  { id: '04854b27-4b15-4068-b443-133823a80801', known_text: 'can speak', target_text: 'puoi parlare' },

  // "more" conflict - S0023 wins with "di più"
  { id: 'fd72233d-5c06-446d-a188-994345e6d31c', known_text: 'a little more', target_text: "un po' più" },
  { id: 'd98fa29a-c0df-4fc0-96cd-4ae8c5c9223c', known_text: 'more slowly', target_text: 'più lentamente' },
  { id: 'fa3cba80-70d8-4a48-be9a-1c8943556039', known_text: 'more important', target_text: 'più importante' },
  { id: 'e6715146-9e09-4fa5-a7f7-5309d5e926a9', known_text: 'more time', target_text: 'più tempo' },
  { id: 'e61a0ad4-48bd-4aab-912d-051c156ed988', known_text: 'more time', target_text: 'più tempo' },
  { id: '190f3aef-aeab-4070-aadb-93f0f776d8c5', known_text: 'more to learn', target_text: 'ancora da imparare' },
  { id: 'ba9dd466-e7c2-4b92-b913-1363a61a0a82', known_text: 'more to learn', target_text: 'altro da imparare' },

  // "help" conflict - S0025 wins with verb "aiutare"
  { id: '112cc979-60e0-4aa0-9433-e3b45ed480d4', known_text: 'ask for help', target_text: 'chiedere aiuto' },
  { id: 'f7dca5b1-4f98-4c77-bbdf-6f775c9eed4b', known_text: 'ask for help', target_text: 'chiedere aiuto' },

  // "time" conflict - S0027 wins with "tempo"
  { id: '5d93065c-8307-4830-b731-279308426220', known_text: 'last time', target_text: "l'ultima volta" },

  // "about" conflict - S0038 wins with "circa"
  { id: '6965479c-9cd7-47f9-aed3-73f2df66b2b5', known_text: 'about this language', target_text: 'su questa lingua' },
  { id: 'a75c6b0d-ddde-406d-a800-5000330bbe8f', known_text: 'about how', target_text: 'di come' },
  { id: '6b80e98b-3541-4cc2-b959-495e034d35b1', known_text: 'about something', target_text: 'di qualcosa' },

  // "than" conflict - S0042 wins with "di"
  { id: '9b41e8d7-2ad3-44eb-a7a5-c6a0f93b2469', known_text: 'than yesterday', target_text: 'che ieri' },
  { id: '9eb67ea5-a803-4c7b-b2a0-bffed454b6a1', known_text: 'than to be', target_text: 'che essere' },
  { id: '6ee3605b-52fa-4b8c-b00a-6b485bd5b493', known_text: 'earlier than I wanted', target_text: 'prima di quanto volessi' },

  // "I need" conflict - S0044 wins with "devo"
  { id: '67f22f2b-5a73-46f0-96f9-be4ca4329ec1', known_text: 'I need a little more time', target_text: "ho bisogno di un po' più di tempo" },
  { id: '7e8a228e-f4c6-4d74-bdb3-e004981d1a15', known_text: "I don't need to", target_text: 'non ho bisogno di' },

  // "that" conflict - S0047 wins with "che"
  { id: '9a8c1696-c6b9-4ee4-be3c-6a016953100d', known_text: "that's less", target_text: 'quello è meno' },
  { id: 'c6f9449a-2386-4fca-806f-feef99b3b5d8', known_text: "that wasn't", target_text: 'quello non era' },
  { id: '42436fc5-65d0-4979-bef1-dd9725c84c64', known_text: "that isn't", target_text: 'quello non è' },
  { id: '1f6ada29-af1f-46ab-b306-b9838b84b8a9', known_text: 'about that', target_text: 'di quello' },

  // "doing" conflict - S0051 wins with "fare"
  { id: 'fac71d13-db52-4612-91e7-9fd5cc634c76', known_text: "we're doing", target_text: 'stiamo facendo' },

  // "so" conflict - S0056 wins with "così"
  { id: '53f11be7-d878-48bd-8c0c-d9983aaa83ef', known_text: 'so I hope', target_text: 'quindi spero' },
  { id: '7ccb923b-5bd7-4579-9e15-78b771c7c70a', known_text: "so I don't need", target_text: 'quindi non ho bisogno' },

  // "I know" conflict - S0059 wins with "so"
  { id: '90ec0037-20aa-462c-b84a-44cd8151071f', known_text: 'I know a young man', target_text: 'conosco un uomo giovane' },
  { id: '77bca158-69eb-4043-98f3-4c510e88a74a', known_text: 'I know an old man', target_text: 'conosco un vecchio' },
  { id: 'f2d36979-96db-4237-a416-d539b7960544', known_text: 'I know an old woman', target_text: 'conosco una vecchia' },
  { id: '8eebd4ca-a33a-4699-a899-a5ba5702e3d8', known_text: 'I know a young woman', target_text: 'conosco una donna giovane' },
  { id: 'cc066037-f318-4d34-b141-61014fd124d9', known_text: 'I know someone', target_text: 'conosco qualcuno' },

  // "I don't know" conflict - S0060 wins with "non so"
  { id: '56ce5b07-5672-4ff6-ba63-b32d02a5b1cb', known_text: "people I don't know", target_text: 'persone che non conosco' },
  { id: 'fe388159-1119-4b9e-a730-6c3016e23e01', known_text: "people I don't know", target_text: 'persone che non conosco' },

  // "just" conflict - S0106 wins with "solo"
  { id: '6df6e504-3dc9-4871-8fc8-9dc7cabec06d', known_text: 'just started', target_text: 'appena iniziato' },
  { id: 'fc73503b-3064-45c0-b0ed-98b7984e49c9', known_text: 'just started', target_text: 'appena iniziato' },

  // "work" conflict - S0106 wins with "lavorare"
  { id: '6d84e267-6c46-44b0-9002-e0f53373da24', known_text: 'this work', target_text: 'questo lavoro' },
  { id: '8196c5fb-1ddf-4787-847d-84b3f733164d', known_text: 'at work', target_text: 'al lavoro' },

  // "night" conflict - S0108 wins with "notte"
  { id: 'f44c98f6-fc73-40b3-93ce-c83ba252c85b', known_text: 'Saturday night', target_text: 'sabato sera' },
  { id: 'cde59273-eb24-4484-b589-02a8f192a301', known_text: 'tomorrow night', target_text: 'domani sera' },
  { id: 'b8580ed0-8472-4ca6-ac73-5da1cf9b19a0', known_text: 'Saturday night', target_text: 'sabato sera' },

  // "as" conflict - S0143 wins with "di cui"
  { id: '08559e77-4c88-4da5-a9a6-8b2a3603bbae', known_text: 'as a group', target_text: 'come gruppo' },

  // "do you think" conflict - S0162 wins with "pensi"
  { id: '10fca52d-4dab-45d2-957f-c86a20aca2fc', known_text: "do you think you'll", target_text: 'pensi che' },
];

// Mark absorbed LEGOs as not new
const absorbedIds = [
  'f5dd2cfd-21ad-45ea-99d4-806c5d1073d4', // S0068 absorbed for "what are you looking for"
];

async function applyUpdates() {
  console.log(`Applying ${updates.length} Phase 2 upchunks to ita_for_eng...`);

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { data, error } = await supabase
      .from('course_legos')
      .update({ known_text: update.known_text, target_text: update.target_text })
      .eq('id', update.id);

    if (error) {
      console.error(`Error updating ${update.id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\nUpdates complete: ${successCount} success, ${errorCount} errors`);

  // Mark absorbed LEGOs as is_new = false
  if (absorbedIds.length > 0) {
    console.log(`\nMarking ${absorbedIds.length} absorbed LEGOs as is_new=false...`);

    for (const id of absorbedIds) {
      const { error } = await supabase
        .from('course_legos')
        .update({ is_new: false })
        .eq('id', id);

      if (error) {
        console.error(`Error marking absorbed ${id}:`, error.message);
      }
    }
  }

  // Verify a few updates
  console.log('\nVerifying sample updates...');
  const sampleIds = ['c94f6784-1ba2-4302-a72e-d333946a87cd', 'a4a20b54-3861-4f0b-9a74-aa2469c80ddf'];

  for (const id of sampleIds) {
    const { data, error } = await supabase
      .from('course_legos')
      .select('id, known_text, target_text')
      .eq('id', id)
      .single();

    if (data) {
      console.log(`  ${data.known_text} → ${data.target_text}`);
    }
  }

  console.log('\nPhase 2 conflict resolution complete for ita_for_eng!');
}

applyUpdates().catch(console.error);
