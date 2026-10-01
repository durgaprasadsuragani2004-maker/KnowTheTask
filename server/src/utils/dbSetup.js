const fs = require('fs');
const path = require('path');
const { connectDB, getPool } = require('../config/db');

async function runSetup() {
  console.log('--- KnowTheTask Database Initialization & Seeding ---');
  try {
    await connectDB();
    const pool = getPool();

    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    console.log('📜 Applying database schema...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Schema created successfully.');

    console.log('🌱 Seeding database...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seedSql);
    console.log('✅ Seed data inserted successfully.');

    // Verify users
    const usersResult = await pool.query('SELECT id, name, email, role, is_active FROM users ORDER BY role');
    console.log('\n👥 Seeded Users:');
    console.table(usersResult.rows);

    const projectsResult = await pool.query('SELECT id, name, status FROM projects');
    console.log('\n📁 Seeded Projects:');
    console.table(projectsResult.rows);

    const tasksResult = await pool.query('SELECT id, title, priority, status FROM tasks');
    console.log('\n📋 Seeded Tasks:');
    console.table(tasksResult.rows);

    console.log('\n✨ Database setup finished successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = runSetup;
