import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool';
import { emailService } from '../src/services/email.service';

/**
 * Script to create a user and send welcome email to test the template
 * Usage: npm run test:email-template (or ts-node -r dotenv/config scripts/test-email-template.ts)
 */

const TEST_EMAIL = 'affanmomin14@gmail.com';
const TEST_NAME = 'Test User';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USER_TYPE = 'EMPLOYEE'; // Can be 'ADMIN', 'EMPLOYEE', or 'CLIENT'
const ORGANIZATION_NAME = 'Test Organization';

async function testEmailTemplate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Creating user and testing email template...\n');

    await client.query('BEGIN');

    // 1. Get or create organization
    let organizationId: string;
    const { rows: orgRows } = await client.query(
      `SELECT id FROM organization WHERE name = $1`,
      [ORGANIZATION_NAME]
    );

    if (orgRows.length > 0) {
      organizationId = orgRows[0].id;
      console.log(`✅ Using existing organization: ${ORGANIZATION_NAME} (${organizationId})`);
    } else {
      const { rows: newOrgRows } = await client.query(
        `INSERT INTO organization (name) VALUES ($1) RETURNING id`,
        [ORGANIZATION_NAME]
      );
      organizationId = newOrgRows[0].id;
      console.log(`✅ Created organization: ${ORGANIZATION_NAME} (${organizationId})`);
    }

    // 2. Check if user already exists
    const { rows: existingUser } = await client.query(
      `SELECT id, email, full_name, user_type FROM app_user WHERE email = $1`,
      [TEST_EMAIL.toLowerCase()]
    );

    let userId: string;
    let userName: string;
    let userType: string;

    if (existingUser.length > 0) {
      // User exists, update it
      userId = existingUser[0].id;
      userName = existingUser[0].full_name;
      userType = existingUser[0].user_type;
      
      // Update user to ensure it's active and in the correct organization
      await client.query(
        `UPDATE app_user 
         SET organization_id = $1, is_active = true, user_type = $2
         WHERE id = $3`,
        [organizationId, TEST_USER_TYPE, userId]
      );
      console.log(`✅ Updated existing user: ${TEST_EMAIL}`);
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
      const { rows: userRows } = await client.query(
        `INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
         VALUES ($1, NULL, $2, $3, $4, $5, true)
         RETURNING id, email, full_name, user_type`,
        [organizationId, TEST_USER_TYPE, TEST_EMAIL.toLowerCase(), TEST_NAME, passwordHash]
      );
      const user = userRows[0];
      userId = user.id;
      userName = user.full_name;
      userType = user.user_type;
      console.log(`✅ Created user: ${userName} (${user.email})`);
      console.log(`   User Type: ${user.user_type}`);
      console.log(`   User ID: ${user.id}`);
    }

    await client.query('COMMIT');

    console.log('\n📧 Sending welcome email...\n');

    // 3. Send welcome email
    await emailService.sendWelcomeEmail({
      id: userId,
      email: TEST_EMAIL,
      name: userName,
      userType: userType as 'ADMIN' | 'EMPLOYEE' | 'CLIENT',
      password: TEST_PASSWORD, // Include password for auto-fill link
    });

    console.log('\n🎉 Email sent successfully!\n');
    console.log('User Details:');
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Name: ${userName}`);
    console.log(`  User Type: ${userType}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log(`  Organization ID: ${organizationId}`);
    console.log('\n📬 Check your inbox at affanmomin14@gmail.com');
    console.log('   (Also check spam/junk folder if not in inbox)\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
testEmailTemplate()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

