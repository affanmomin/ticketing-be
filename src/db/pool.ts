import { Pool, Client } from 'pg';

// Use DATABASE_URL from environment. Supabase requires SSL, so enable it here.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err: unknown) => {
  console.error('pg pool error', err);
});


const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default client;


