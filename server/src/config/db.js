const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const EmbeddedPostgres = require('embedded-postgres').default;
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config(); // also loads server/.env if present

const DB_PORT = parseInt(process.env.DB_PORT || '5433', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'knowthetask';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';

const defaultUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const connectionString = process.env.DATABASE_URL || defaultUrl;

let pool = null;
let embeddedInstance = null;

async function startEmbeddedIfNecessary() {
  const dbDir = path.resolve(__dirname, '../../../database/data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  embeddedInstance = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    persistent: true,
  });

  try {
    // Initialise if cluster doesn't exist yet
    if (!fs.existsSync(path.join(dbDir, 'PG_VERSION'))) {
      console.log('📦 Initialising embedded PostgreSQL cluster at database/data...');
      await embeddedInstance.initialise();
    }
    console.log(`🚀 Starting PostgreSQL on port ${DB_PORT}...`);
    await embeddedInstance.start();
    console.log('✅ PostgreSQL engine started successfully.');

    // Ensure database exists
    const adminPool = new Pool({
      user: DB_USER,
      password: DB_PASSWORD,
      host: DB_HOST,
      port: DB_PORT,
      database: 'postgres',
    });

    const res = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (res.rowCount === 0) {
      console.log(`Creating database "${DB_NAME}"...`);
      await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database "${DB_NAME}" created.`);
    }

    await adminPool.end();
  } catch (err) {
    // If it's already running, proceed
    if (err.message && err.message.includes('already')) {
      console.log('PostgreSQL instance already running.');
    } else {
      console.warn('Note on embedded postgres:', err.message);
    }
  }
}

async function testConnection(connStr) {
  const testPool = new Pool({
    connectionString: connStr,
    connectionTimeoutMillis: 2000,
  });
  try {
    const res = await testPool.query('SELECT NOW()');
    await testPool.end();
    return true;
  } catch (err) {
    await testPool.end();
    return false;
  }
}

async function connectDB() {
  if (pool) return pool;

  console.log('🔌 Checking PostgreSQL connection...');
  let canConnect = await testConnection(connectionString);

  if (!canConnect) {
    console.log('⚠️ Could not connect to external PostgreSQL. Attempting embedded PostgreSQL...');
    await startEmbeddedIfNecessary();
    canConnect = await testConnection(connectionString);
  }

  if (!canConnect) {
    throw new Error(`Failed to connect to PostgreSQL at ${connectionString}`);
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    if (err.code === '57P01') return; // Expected during shutdown
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  console.log(`✅ Connected to PostgreSQL database [${connectionString.replace(/:[^:]*@/, ':****@')}]`);
  return pool;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
    });
  }
  return pool;
}

module.exports = {
  connectDB,
  getPool,
  query: (text, params) => getPool().query(text, params),
};
