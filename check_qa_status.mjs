import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key] = value;
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('course_practice_phrases')
  .select('seed_number, qa_checked, qa_flag_type')
  .eq('course_code', 'kor_for_eng')
  .gte('seed_number', 161)
  .lte('seed_number', 170);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const summary = {};
for (const phrase of data) {
  if (!summary[phrase.seed_number]) {
    summary[phrase.seed_number] = { total: 0, checked: 0, unchecked: 0, flagged: 0 };
  }
  summary[phrase.seed_number].total++;
  if (phrase.qa_checked) {
    summary[phrase.seed_number].checked++;
  } else {
    summary[phrase.seed_number].unchecked++;
  }
  if (phrase.qa_flag_type) {
    summary[phrase.seed_number].flagged++;
  }
}

console.log(JSON.stringify(Object.entries(summary).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([seed, stats]) => ({
  seed_number: parseInt(seed),
  ...stats
})), null, 2));
