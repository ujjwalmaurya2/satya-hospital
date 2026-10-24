/**
 * Direct Migration Runner for Satya Hospital & Pathology Database
 * 
 * Usage:
 *   node supabase/apply_master_migration.cjs [DB_PASSWORD_OR_FULL_URI]
 * 
 * Example:
 *   node supabase/apply_master_migration.cjs "MySecurePass123!"
 *   node supabase/apply_master_migration.cjs "postgresql://postgres:MySecurePass123!@db.rkwbzkxkksdyhxoqpmhg.supabase.co:5432/postgres"
 */

const fs = require('fs');
const path = require('path');

async function run() {
  let pg;
  try {
    pg = require('pg');
  } catch (err) {
    console.error('ERROR: "pg" module not installed. Please run "npm install pg --save-dev" first.');
    process.exit(1);
  }

  const { Client } = pg;
  const inputArg = process.argv[2] || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_PASSWORD;

  if (!inputArg) {
    console.error('\n[!] Missing Database Password or URI.\n');
    console.error('Please run with your Supabase database password:');
    console.error('  node supabase/apply_master_migration.cjs "<YOUR_DB_PASSWORD>"\n');
    console.error('Or provide the full connection URI:');
    console.error('  node supabase/apply_master_migration.cjs "postgresql://postgres:<YOUR_DB_PASSWORD>@db.rkwbzkxkksdyhxoqpmhg.supabase.co:5432/postgres"\n');
    process.exit(1);
  }

  let connectionString = inputArg;
  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    // Treat as password
    const passwordEncoded = encodeURIComponent(inputArg);
    connectionString = `postgresql://postgres:${passwordEncoded}@db.rkwbzkxkksdyhxoqpmhg.supabase.co:5432/postgres`;
  }

  console.log('Connecting to Supabase PostgreSQL database (db.rkwbzkxkksdyhxoqpmhg.supabase.co)...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(' Successfully connected to Supabase database!');

    // Optional 2nd arg: a specific migration file (e.g. migrations/20261024000003_staff_queue_desk.sql)
    const sqlFilePath = process.argv[3]
      ? path.resolve(__dirname, process.argv[3])
      : path.join(__dirname, 'complete_satya_hospital_setup.sql');
    console.log(`Reading SQL from: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing master schema migration and initial seed data...');
    await client.query(sqlContent);
    console.log('\n SUCCESS: Satya Hospital database schema and initial data applied successfully!');
    
    // Quick verification count
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\nVerified ${res.rows.length} public tables in database:`);
    res.rows.forEach(r => console.log(`  - ${r.table_name}`));

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('\n Migration Failed:');
    console.error(err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\n Hint: The password provided does not match the database password for user "postgres".');
      console.error('You can reset your database password in the Supabase Dashboard:');
      console.error('  Project Settings -> Database -> Reset database password\n');
    }
    process.exit(1);
  }
}

run();
