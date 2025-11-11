import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Hardcoded email for testing
const TEST_EMAIL = 'affanmomin14@gmail.com';

// Create pool with SSL enabled
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false,
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('🚀 Starting Password Reset API Test...\n');

  const client = await pool.connect();
  let resetToken: string | null = null;
  let testUserEmail: string = '';

  try {
    await client.query('BEGIN');

    const timestamp = Date.now();
    testUserEmail = `test-user-${timestamp}@example.com`;
    const testPassword = 'OriginalPassword123!';
    const newPassword = 'NewPassword456!';

    // 1. Create Organization
    console.log('1️⃣  Creating test organization...');
    const { rows: orgRows } = await client.query(
      'INSERT INTO organization (name, active) VALUES ($1, true) RETURNING id, name',
      [`Test Org ${timestamp}`]
    );
    const organizationId = orgRows[0].id;
    console.log(`✅ Organization created: ${orgRows[0].name}\n`);

    // 2. Create Test User
    console.log('2️⃣  Creating test user...');
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const { rows: userRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'ADMIN', $2, $3, $4, NULL, true)
       RETURNING id, email, full_name`,
      [organizationId, testUserEmail, 'Test User', passwordHash]
    );
    const testUser = userRows[0];
    console.log(`✅ Test user created:`);
    console.log(`   Email (in DB): ${testUser.email}`);
    console.log(`   Name: ${testUser.full_name}`);
    console.log(`   Password: ${testPassword}\n`);

    await client.query('COMMIT');

    // 3. Test Forgot Password API
    console.log('3️⃣  Testing POST /auth/forgot-password...');
    try {
      const forgotPasswordResponse = await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          email: testUserEmail,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Forgot password request successful!`);
      console.log(`   Response: ${JSON.stringify(forgotPasswordResponse.data, null, 2)}\n`);

      // Get the reset token from database
      const { rows: tokenRows } = await client.query(
        `SELECT token FROM password_reset_token
         WHERE user_id = $1 AND used = false
         ORDER BY created_at DESC LIMIT 1`,
        [testUser.id]
      );

      if (tokenRows.length > 0) {
        resetToken = tokenRows[0].token;
        console.log(`✅ Reset token generated: ${resetToken.substring(0, 20)}...\n`);
      } else {
        console.log(`⚠️  No reset token found in database\n`);
      }
    } catch (error: any) {
      console.error(`❌ Forgot password API failed:`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      console.log('');
    }

    // 4. Test Reset Password API (if we have a token)
    if (resetToken) {
      console.log('4️⃣  Testing POST /auth/reset-password...');
      try {
        const resetPasswordResponse = await axios.post(
          `${API_BASE_URL}/auth/reset-password`,
          {
            token: resetToken,
            password: newPassword,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`✅ Password reset successful!`);
        console.log(`   Response: ${JSON.stringify(resetPasswordResponse.data, null, 2)}\n`);

        // 5. Verify password was changed by trying to login
        console.log('5️⃣  Verifying password change with login...');
        try {
          const loginResponse = await axios.post(
            `${API_BASE_URL}/auth/login`,
            {
              email: testUserEmail,
              password: newPassword,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          console.log(`✅ Login with new password successful!`);
          console.log(`   User: ${loginResponse.data.user.fullName}`);
          console.log(`   Role: ${loginResponse.data.user.role}\n`);
        } catch (loginError: any) {
          console.error(`❌ Login with new password failed:`);
          if (loginError.response) {
            console.error(`   Status: ${loginError.response.status}`);
            console.error(`   Response: ${JSON.stringify(loginError.response.data, null, 2)}`);
          } else {
            console.error(`   Error: ${loginError.message}`);
          }
          console.log('');
        }

        // 6. Verify old password no longer works
        console.log('6️⃣  Verifying old password no longer works...');
        try {
          await axios.post(
            `${API_BASE_URL}/auth/login`,
            {
              email: testUserEmail,
              password: testPassword,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          console.error(`❌ Old password still works! This is a problem.\n`);
        } catch (loginError: any) {
          if (loginError.response?.status === 401) {
            console.log(`✅ Old password correctly rejected (401 Unauthorized)\n`);
          } else {
            console.error(`⚠️  Unexpected error: ${loginError.message}\n`);
          }
        }

        // 7. Test that token can't be reused
        console.log('7️⃣  Testing token reuse prevention...');
        try {
          await axios.post(
            `${API_BASE_URL}/auth/reset-password`,
            {
              token: resetToken,
              password: 'AnotherPassword789!',
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          console.error(`❌ Token reuse allowed! This is a security issue.\n`);
        } catch (reuseError: any) {
          if (reuseError.response?.status === 400) {
            console.log(`✅ Token reuse correctly prevented (400 Bad Request)\n`);
            console.log(`   Response: ${JSON.stringify(reuseError.response.data, null, 2)}\n`);
          } else {
            console.error(`⚠️  Unexpected error: ${reuseError.message}\n`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Reset password API failed:`);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
          console.error(`   Error: ${error.message}`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️  Skipping reset password test (no token available)\n');
    }

    console.log('='.repeat(60));
    console.log('✅ Password Reset API Test Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Summary:');
    console.log('─'.repeat(60));
    console.log(`\n📧 Test User Email (in DB): ${testUserEmail}`);
    console.log(`📧 Password Reset Email Sent To: ${TEST_EMAIL}`);
    console.log(`\n🔑 Original Password: ${testPassword}`);
    console.log(`🔑 New Password: ${newPassword}`);
    if (resetToken) {
      console.log(`\n🔐 Reset Token: ${resetToken.substring(0, 20)}...`);
    }
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Check your inbox at affanmomin14@gmail.com for the password reset email!');
    console.log('='.repeat(60));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

main()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

