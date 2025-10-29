import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool';

/**
 * Script to create an admin user manually
 * Usage: npm run db:create-admin
 */

async function createAdminUser() {
  const client = await pool.connect();

  try {
    // Configuration - CHANGE THESE VALUES
    const adminEmail = 'admin@company.com';
    const adminName = 'Admin User';
    const adminPassword = 'Admin123!'; // Change this to a secure password
    const tenantName = 'My Company'; // Your company name

    console.log('🚀 Creating admin user...\n');

    await client.query('BEGIN');

    // 1. Create or get tenant
    let tenantId: string;
    const { rows: tenantRows } = await client.query(
      `INSERT INTO tenant (name) 
       VALUES ($1) 
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantName],
    );
    tenantId = tenantRows[0].id;
    console.log(`✅ Tenant created/found: ${tenantName} (${tenantId})`);

    // 2. Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    console.log('✅ Password hashed');

    // 3. Create admin user with direct tenant_id reference (simplified schema)
    const { rows: userRows } = await client.query(
      `INSERT INTO "user" (email, name, password_hash, user_type, tenant_id, active)
       VALUES ($1, $2, $3, 'ADMIN', $4, true)
       ON CONFLICT (email) 
       DO UPDATE SET name = EXCLUDED.name, user_type = 'ADMIN', tenant_id = EXCLUDED.tenant_id, active = true
       RETURNING id, email, name, user_type`,
      [adminEmail.toLowerCase(), adminName, passwordHash, tenantId],
    );
    const user = userRows[0];
    console.log(`✅ Admin user created/updated: ${user.name} (${user.email})`);
    console.log(`   User Type: ${user.user_type}`);
    console.log(`   User ID: ${user.id}`);

    await client.query('COMMIT');

    console.log('\n🎉 Admin user successfully created!\n');
    console.log('Login credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  Tenant ID: ${tenantId}`);
    console.log('\n⚠️  Please change the password after first login!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
