const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function listTables() {
  const candidates = ["practice_phrases", "phrases", "basket_items", "course_practice_phrases"];
  
  for (const table of candidates) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(table + ": " + error.message);
    } else {
      console.log(table + ": EXISTS - columns:", Object.keys(data[0] || {}).join(", "));
    }
  }
}

listTables().catch(console.error);
