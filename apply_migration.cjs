const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Read the migration file
const migration = fs.readFileSync('./database/migrations/20260202_bulk_update_syllables.sql', 'utf8');

// Execute the migration
async function applyMigration() {
  try {
    console.log('Applying migration: 20260202_bulk_update_syllables.sql');
    console.log('');
    
    // Parse and execute each SQL statement from the migration
    // Extract statements (remove comments and split by semicolons)
    const lines = migration
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n');
    
    // Split into individual statements
    const statements = lines
      .split(/;(?=\s*$|\s*[A-Z])/gm)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} statement(s) to execute`);
    console.log('');
    
    // For now, just test that we can call RPC functions
    const { data, error } = await supabase.rpc('bulk_update_syllables', {
      p_ids: [],
      p_syllables: []
    });
    
    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log('✗ Function does not exist yet');
        console.log('');
        console.log('IMPORTANT: The migration file has been created at:');
        console.log('  database/migrations/20260202_bulk_update_syllables.sql');
        console.log('');
        console.log('To apply it, use one of these methods:');
        console.log('');
        console.log('1. Via Supabase Studio Dashboard:');
        console.log('   - Go to SQL Editor');
        console.log('   - Copy/paste the contents of the migration file');
        console.log('   - Run it');
        console.log('');
        console.log('2. Via Supabase CLI (if linked):');
        console.log('   - supabase db push');
        console.log('');
        console.log('3. Or manually run the SQL on your Supabase instance');
        process.exit(1);
      }
      console.error('Error:', error.message);
      process.exit(1);
    }
    
    console.log('✓ Function bulk_update_syllables exists and is callable');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
