const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync("public/vfs/courses/spa_for_eng/course_manifest.json", "utf8"));

// The 7 presentations to update with gender explanations
const updates = {
  "no estoy seguro": `The Spanish for 'I'm not sure', as in 'I'm not sure if I can remember the whole sentence.', is: ... 'no estoy seguro' - In Spanish, men and women say some words slightly differently when referring to themselves. If you listen closely, you will hear the female voice saying it one way, and the male voice saying it another way.`,

  "estuviera casi preparado": `The Spanish for 'I were nearly ready', as in 'I like feeling as if I'm nearly ready to go.', is: ... 'estuviera casi preparado' ... 'estuviera casi preparado' - Here we have another one of those words that change based on gender. Since the speakers are referring to themselves, you'll heard them pronounce the end of the word slightly differently from each other. Don't worry about this as it'll come naturally to you, but do listen out for it from now on.`,

  "con mis amigos": `The Spanish for 'with my friends', as in 'I enjoy doing interesting things with my friends.', is: ... 'con mis amigos' ... 'con mis amigos' - In Spanish, similarly to when referring to yourself, some words can change slightly based on who you're referring to. When referring to male friends or a mixed group of friends, you'll hear it with an 'o' at the end, and when referring to female friends you'll hear 'a' at the end. Both speakers could use either one based on who they're talking about, but to get you used to hearing both, we'll have the female voice refer to female friends and the male voice refer to male friends.`,

  "a su amigo": `The Spanish for 'to his friend', as in 'He wanted to write a letter to his friend last week.', is: ... 'a su amigo' ... 'a su amigo' - just like with the plural, the female voice will usually refer to a female friend and a male voice will refer to a male friend. Listen out for the difference, but don't worry about it!`,

  "estás seguro": `The Spanish for 'are you sure', as in 'Are you sure you don't mind helping me?', is: ... 'estás seguro' ... 'estás seguro' - You might have noticed this is one of those words that change based on gender. When you're referring to someone else, the word will change based on their gender rather than yours. Like with when we talked about friends, we'll have the female voice speak as if she's talking to a female friend, and the male voice speak as if he's talking to a male friend, just to give you practice hearing both variations. You can say whichever pops into your head first.`,

  "Pienso que estás": `The Spanish for 'I think that you're', as in 'I think that you're doing very well.', is: ... 'Pienso que estás' ... 'Pienso que estás' - Since you'll be referring to someone else, listen out for any words where you hear the gender difference!`,

  "ese niño": `The Spanish for 'that child', as in 'That child with the black hair opposite the post office.', is: ... 'ese niño' ... 'ese niño' - just like with friends, child changes the ending based on whether you're referring to a female child or a male child. The female voice will usually be talking about a female child and the male voice will usually talk about a male child, to get you used to the difference.`
};

const samples = manifest.slices?.[0]?.samples || {};
let updated = 0;

for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    for (const item of seed.introduction_items || []) {
      if (item.presentation == null) continue;
      const introTarget = item.node?.target?.text || "";

      if (updates[introTarget]) {
        const oldPres = item.presentation;
        const newPres = updates[introTarget];

        console.log(`\nUpdating: "${introTarget}"`);
        console.log(`  OLD: "${oldPres.substring(0, 60)}..."`);
        console.log(`  NEW: "${newPres.substring(0, 60)}..."`);

        // Update presentation text in structure
        item.presentation = newPres;

        // Update in samples - need to rename the key
        if (samples[oldPres]) {
          samples[newPres] = samples[oldPres];
          delete samples[oldPres];
          console.log(`  Samples key updated`);
        }

        updated++;
      }
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Updated ${updated} presentations`);

// Save manifest
fs.writeFileSync("public/vfs/courses/spa_for_eng/course_manifest.json", JSON.stringify(manifest, null, 2));
console.log(`Manifest saved`);
