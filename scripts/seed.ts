import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Please configure your .env (include ?sslmode=require for Supabase).');
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'secret123';
  const tenantName = process.env.TENANT_NAME || 'My Agency';

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure one tenant exists
    const t = await client.query('select id from "Tenant" where name=$1', [tenantName]);
    let tenantId: string;
    if (t.rowCount) {
      tenantId = t.rows[0].id;
    } else {
      const ins = await client.query('insert into "Tenant"(id, name) values (gen_random_uuid(), $1) returning id', [tenantName]);
      tenantId = ins.rows[0].id;
    }

    // Upsert user
    const u0 = await client.query('select id from "User" where email=$1', [email]);
    let userId: string;
    if (u0.rowCount) {
      userId = u0.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const u1 = await client.query(
        'insert into "User"(id, email, name, "passwordHash", "active") values (gen_random_uuid(), $1, $2, $3, true) returning id',
        [email, 'Admin', passwordHash],
      );
      userId = u1.rows[0].id;
    }

    // Upsert membership as ADMIN
    const m0 = await client.query('select id from "tenant_membership" where "tenantId"=$1 and "userId"=$2', [tenantId, userId]);
    if (!m0.rowCount) {
      await client.query(
        'insert into "tenant_membership"(id, "tenantId", "userId", role) values (gen_random_uuid(), $1, $2, $3)',
        [tenantId, userId, 'ADMIN'],
      );
    }

    await client.query('COMMIT');
    console.log('Seeded admin user:', email, 'tenantId:', tenantId);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
