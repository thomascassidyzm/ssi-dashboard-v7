const { Client } = require('pg');
const fs = require('fs');
const url = fs.readFileSync(__dirname+'/../../.env.psql','utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1].trim();
module.exports.q = async (sql, params=[]) => {
  const c = new Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, params)).rows; } finally { await c.end(); }
};
