const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('public/vfs/courses/spa_for_eng/course_manifest.json', 'utf8'));

// The 6 presentation texts that need UUIDs cleared (with correct format - two target repetitions)
const newPresentations = {
  "no estoy seguro": "The Spanish for 'I'm not sure', as in 'I'm not sure if I can remember the whole sentence.', is: ... 'no estoy seguro' ... 'no estoy seguro' - In Spanish, men and women say some words slightly differently when referring to themselves. If you listen closely, you will hear the female voice saying it one way, and the male voice saying it another way.",

  "estuviera casi preparado": "The Spanish for 'I were nearly ready', as in 'I like feeling as if I'm nearly ready to go.', is: ... 'estuviera casi preparado' ... 'estuviera casi preparado' - Here we have another one of those words that change based on gender. Since the speakers are referring to themselves, you'll heard them pronounce the end of the word slightly differently from each other. Don't worry about this as it'll come naturally to you, but do listen out for it from now on.",

  "con mis amigos": "The Spanish for 'with my friends', as in 'I enjoy doing interesting things with my friends.', is: ... 'con mis amigos' ... 'con mis amigos' - In Spanish, similarly to when referring to yourself, some words can change slightly based on who you're referring to. When referring to male friends or a mixed group of friends, you'll hear it with an 'o' at the end, and when referring to female friends you'll hear 'a' at the end. Both speakers could use either one based on who they're talking about, but to get you used to hearing both, we'll have the female voice refer to female friends and the male voice refer to male friends.",

  "a su amigo": "The Spanish for 'to his friend', as in 'He wanted to write a letter to his friend last week.', is: ... 'a su amigo' ... 'a su amigo' - just like with the plural, the female voice will usually refer to a female friend and a male voice will refer to a male friend. Listen out for the difference, but don't worry about it!",

  "estás seguro": "The Spanish for 'are you sure', as in 'Are you sure you don't mind helping me?', is: ... 'estás seguro' ... 'estás seguro' - You might have noticed this is one of those words that change based on gender. When you're referring to someone else, the word will change based on their gender rather than yours. Like with when we talked about friends, we'll have the female voice speak as if she's talking to a female friend, and the male voice speak as if he's talking to a male friend, just to give you practice hearing both variations. You can say whichever pops into your head first.",

  "Pienso que estás": "The Spanish for 'I think that you're', as in 'I think that you're doing very well.', is: ... 'Pienso que estás' ... 'Pienso que estás' - Since you'll be referring to someone else, listen out for any words where you hear the gender difference!"
};

const samples = manifest.slices?.[0]?.samples || {};
let updated = 0;

// Find and update the intro items, and remove old sample entries
for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    for (const item of seed.introduction_items || []) {
      if (!item.presentation) continue;
      const targetText = item.node?.target?.text || '';

      for (const [target, newPresText] of Object.entries(newPresentations)) {
        if (targetText.toLowerCase() === target.toLowerCase()) {
          const oldPresText = item.presentation;

          console.log(`\nUpdating: "${targetText}"`);
          console.log(`  OLD: "${oldPresText.substring(0, 60)}..."`);
          console.log(`  NEW: "${newPresText.substring(0, 60)}..."`);

          // Remove old sample entry if exists
          if (samples[oldPresText]) {
            console.log(`  Removing old sample entry`);
            delete samples[oldPresText];
          }

          // Update presentation text
          item.presentation = newPresText;

          // Add new sample entry WITHOUT presentation UUID (main flow will generate)
          // Keep target1 and target2 entries
          const targetSampleKey = targetText;
          const existingTargetSamples = [];

          // Find target samples from manifest
          for (const [key, entries] of Object.entries(samples)) {
            if (key.toLowerCase() === targetText.toLowerCase()) {
              for (const entry of entries) {
                if (entry.role === 'target1' || entry.role === 'target2') {
                  existingTargetSamples.push(entry);
                }
              }
            }
          }

          // Create new sample entry with just targets (no presentation)
          samples[newPresText] = existingTargetSamples.length > 0 ? existingTargetSamples : [];
          console.log(`  Created sample entry with ${existingTargetSamples.length} target samples`);

          updated++;
        }
      }
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Updated ${updated} presentations`);

// Save manifest
fs.writeFileSync('public/vfs/courses/spa_for_eng/course_manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Manifest saved`);
