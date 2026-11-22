// Dispatch one plan-only authoring slice from authoring-brief.txt (cs #759·AI). Posts to the surface only.
// usage: T=<conv token> node dispatch-slice.cjs <course> "<seeds>" "<extra>"
const fs = require('fs');
const path = require('path');
const [course, seeds, extra] = process.argv.slice(2);
const mar = course === 'eng_for_mar';
const p = fs.readFileSync(path.join(__dirname, '..', 'authoring-brief.txt'), 'utf8')
  .replace(/__COURSE__/g, course).replace(/__SEEDS__/g, seeds)
  .replace(/__KNOWN__/g, mar ? 'Marathi' : 'English').replace(/__TARGET__/g, mar ? 'English' : 'Brazilian Portuguese')
  .replace(/__EXTRA__/g, extra || '');
fetch('http://localhost:4317/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cs-conv': process.env.T },
  body: JSON.stringify({ cwd: '/home/tomcassidy/SSi/ssi-dashboard-v7-clean', label: `item4 plans ${course} ${seeds.split(' ')[0]}`, prompt: p,
    parent: '3fe30a03-7e80-468c-9f97-025720847251' }) })
  .then(r => r.json()).then(j => console.log(j.jobLabel || '', j.error || '', j.queued ? 'QUEUED' : ''));
