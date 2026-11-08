#!/usr/bin/env node
// Print a pod's turns for scenes 1-10, read-only, live from Popty's pod-scripts route.
//   node tools/pods/pod-drill/pieces/turns.cjs <course> [fromScene] [toScene]
// One line per turn: id | speaker | target | known. Slug pod-1 only.
const [course, from = 1, to = 10] = process.argv.slice(2);
(async () => {
  const d = await (await fetch(`http://localhost:3470/api/pod-scripts/${course}`)).json();
  if (d.slug !== 'pod-1') throw new Error(`${course}: slug is ${d.slug}, not pod-1`);
  for (const s of d.scenes) for (const l of s.lines) {
    if (l.scene_number < +from || l.scene_number > +to) continue;
    console.log([l.id.split(':').pop(), l.speaker, l.target_text, l.known_text].join(' | '));
  }
})();
