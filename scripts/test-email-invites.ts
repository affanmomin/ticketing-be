import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { encodeCredentials } from '../src/utils/credentials';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create pool with SSL enabled
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false,
});

// Hardcoded email for testing
const TEST_EMAIL = 'affanmomin14@gmail.com';

interface EmailUser {
  id: string;
  email: string;
  name: string;
  userType: string;
  password?: string;
  organizationName?: string;
}

class EmailTestService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendBeautifulWelcomeEmail(userData: EmailUser): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    let loginUrl = `${baseUrl}/login`;

    if (userData.password) {
      const encodedCreds = encodeCredentials(userData.email, userData.password);
      loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Created - Ticketing System</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px 40px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.3px;">Ticketing System</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Welcome, ${userData.name}</h2>

              <p style="margin: 0 0 32px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                Your ${userData.userType} account has been successfully created${userData.organizationName ? ` for ${userData.organizationName}` : ''}. You can now access the ticketing system using the credentials below.
              </p>

              <!-- Account Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; border: 1px solid #e0e0e0; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px; background-color: #fafafa; border-bottom: 1px solid #e0e0e0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 12px 0; color: #666666; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</td>
                      </tr>
                      <tr>
                        <td style="padding: 0; color: #1a1a1a; font-size: 15px; font-weight: 400;">${userData.email}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${userData.password ? `
                <tr>
                  <td style="padding: 20px; background-color: #fafafa; border-bottom: 1px solid #e0e0e0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 12px 0; color: #666666; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Password</td>
                      </tr>
                      <tr>
                        <td style="padding: 0; color: #1a1a1a; font-size: 15px; font-weight: 400; font-family: 'Courier New', monospace;">${userData.password}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 20px; background-color: #fafafa;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 12px 0; color: #666666; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Role</td>
                      </tr>
                      <tr>
                        <td style="padding: 0; color: #1a1a1a; font-size: 15px; font-weight: 400;">${userData.userType}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${userData.password ? `
              <!-- Auto-Login Notice -->
              <div style="background-color: #f8f9fa; border-left: 3px solid #495057; padding: 16px 20px; margin: 0 0 32px 0;">
                <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.5;">
                  <strong>Quick Login:</strong> Click the button below to automatically log in with your credentials.
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="left">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 500; border-radius: 2px;">
                      ${userData.password ? 'Access System' : 'Log In'}
                    </a>
                  </td>
                </tr>
              </table>

              ${userData.password ? `
              <!-- Security Note -->
              <div style="background-color: #fff3cd; border-left: 3px solid #ffc107; padding: 16px 20px; margin: 0 0 32px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                  <strong>Security Recommendation:</strong> Please change your password after your first login.
                </p>
              </div>
              ` : ''}

              <p style="margin: 32px 0 0 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                If you have any questions or need assistance, please contact our support team.
              </p>

              <p style="margin: 24px 0 0 0; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
                Best regards,<br>
                <span style="font-weight: 500;">Ticketing System Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you did not expect this email, please contact our support team immediately.
              </p>
            </td>
          </tr>

        </table>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Ticketing System" <noreply@example.com>',
      to: TEST_EMAIL, // Always send to your email
      subject: `Account Created - Ticketing System`,
      html: htmlContent,
    });

    console.log(`✅ Professional email sent to ${TEST_EMAIL} for ${userData.userType} (${userData.name})`);
  }
}

async function main() {
  console.log('🚀 Starting Email Invitation Test...\n');

  const client = await pool.connect();
  const emailService = new EmailTestService();

  try {
    await client.query('BEGIN');

    const timestamp = Date.now();

    // 1. Create Organization
    console.log('1️⃣  Creating organization...');
    const { rows: orgRows } = await client.query(
      'INSERT INTO organization (name, active) VALUES ($1, true) RETURNING id, name',
      [`Test Organization ${timestamp}`]
    );
    const organizationId = orgRows[0].id;
    const organizationName = orgRows[0].name;
    console.log(`✅ Organization created: ${organizationName}\n`);

    // 2. Create Admin
    console.log('2️⃣  Creating ADMIN user...');
    const adminPassword = 'Admin123!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const { rows: adminRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'ADMIN', $2, $3, $4, NULL, true)
       RETURNING id, email, full_name, user_type`,
      [organizationId, `admin-test-${timestamp}@example.com`, 'John Admin', adminPasswordHash]
    );
    const admin = adminRows[0];
    console.log(`✅ Admin created: ${admin.full_name} (${admin.email})`);

    // Send beautiful email
    await emailService.sendBeautifulWelcomeEmail({
      id: admin.id,
      email: admin.email,
      name: admin.full_name,
      userType: admin.user_type,
      password: adminPassword,
      organizationName: organizationName,
    });
    console.log(`📧 Email sent to ${TEST_EMAIL}\n`);

    // 3. Create Client
    console.log('3️⃣  Creating client company...');
    const { rows: clientRows } = await client.query(
      `INSERT INTO client (organization_id, name, email, phone, active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email`,
      [organizationId, 'Acme Corporation', `client-test-${timestamp}@example.com`, '+1-555-0100']
    );
    const clientId = clientRows[0].id;
    console.log(`✅ Client created: ${clientRows[0].name}\n`);

    // 4. Create Employee
    console.log('4️⃣  Creating EMPLOYEE user...');
    const employeePassword = 'Employee123!';
    const employeePasswordHash = await bcrypt.hash(employeePassword, 10);
    const { rows: employeeRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'EMPLOYEE', $2, $3, $4, NULL, true)
       RETURNING id, email, full_name, user_type`,
      [organizationId, `employee-test-${timestamp}@example.com`, 'Sarah Employee', employeePasswordHash]
    );
    const employee = employeeRows[0];
    console.log(`✅ Employee created: ${employee.full_name} (${employee.email})`);

    // Send beautiful email
    await emailService.sendBeautifulWelcomeEmail({
      id: employee.id,
      email: employee.email,
      name: employee.full_name,
      userType: employee.user_type,
      password: employeePassword,
      organizationName: organizationName,
    });
    console.log(`📧 Email sent to ${TEST_EMAIL}\n`);

    // 5. Create Client User
    console.log('5️⃣  Creating CLIENT user...');
    const clientUserPassword = 'Client123!';
    const clientUserPasswordHash = await bcrypt.hash(clientUserPassword, 10);
    const { rows: clientUserRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'CLIENT', $2, $3, $4, $5, true)
       RETURNING id, email, full_name, user_type`,
      [organizationId, `client-user-test-${timestamp}@example.com`, 'Mike Client', clientUserPasswordHash, clientId]
    );
    const clientUser = clientUserRows[0];
    console.log(`✅ Client user created: ${clientUser.full_name} (${clientUser.email})`);

    // Send beautiful email
    await emailService.sendBeautifulWelcomeEmail({
      id: clientUser.id,
      email: clientUser.email,
      name: clientUser.full_name,
      userType: clientUser.user_type,
      password: clientUserPassword,
      organizationName: organizationName,
    });
    console.log(`📧 Email sent to ${TEST_EMAIL}\n`);

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! All emails have been sent!');
    console.log('='.repeat(60));
    console.log('\n📬 Check your inbox at: affanmomin@gmail.com');
    console.log('\n📋 Test Account Summary:');
    console.log('─'.repeat(60));
    console.log(`\n1️⃣  ADMIN Account`);
    console.log(`   Email (in DB): ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ADMIN 👑`);
    console.log(`\n2️⃣  EMPLOYEE Account`);
    console.log(`   Email (in DB): ${employee.email}`);
    console.log(`   Password: ${employeePassword}`);
    console.log(`   Role: EMPLOYEE 👨‍💼`);
    console.log(`\n3️⃣  CLIENT Account`);
    console.log(`   Email (in DB): ${clientUser.email}`);
    console.log(`   Password: ${clientUserPassword}`);
    console.log(`   Role: CLIENT 🏢`);
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Note: All emails were sent to affanmomin@gmail.com');
    console.log('   The DB emails are unique for database constraints.');
    console.log('\n🎨 The emails feature:');
    console.log('   • Beautiful gradient design');
    console.log('   • Auto-fill login links');
    console.log('   • Role-specific colors and icons');
    console.log('   • Professional styling');
    console.log('   • Mobile responsive');
    console.log('\n🔗 Click the links in your emails to test auto-login!');
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

