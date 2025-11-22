import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
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
  private resend: Resend;
  private readonly fromAddress: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set. Unable to send emails.');
    }

    this.resend = new Resend(apiKey);
    this.fromAddress = process.env.SMTP_FROM || '"Ticketing System" <onboarding@resend.dev>';
  }

  async sendBeautifulWelcomeEmail(userData: EmailUser): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    let loginUrl = `${baseUrl}/login`;

    if (userData.password) {
      const encodedCreds = encodeCredentials(userData.email, userData.password);
      loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
    }

    const roleColors = {
      ADMIN: { bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', icon: '👑' },
      EMPLOYEE: { bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)', icon: '👨‍💼' },
      CLIENT: { bg: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', icon: '🏢' },
    };

    const roleInfo = roleColors[userData.userType as keyof typeof roleColors] || {
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '👤',
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Ticketing System</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4c63d2 0%, #5a3d7a 100%); padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

              <!-- Header with Gradient -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: ${roleInfo.bg}; padding: 48px 40px; text-align: center;">
                    <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 64px; font-size: 32px;">
                      ${roleInfo.icon}
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome Aboard!</h1>
                    <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">Your account has been created</p>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 48px 40px;">

                    <p style="margin: 0 0 24px 0; color: #2d3748; font-size: 16px; line-height: 1.7; font-weight: 400;">
                      Hello <strong style="color: #1a202c; font-weight: 600;">${userData.name}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                      Your <strong style="color: #2d3748;">${userData.userType}</strong> account has been successfully created${userData.organizationName ? ` for <strong>${userData.organizationName}</strong>` : ''}. You're all set to start managing tickets efficiently!
                    </p>

                    <!-- Account Details Card -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            Account Details
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Email:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right;">${userData.email}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Role:</td>
                              <td style="padding: 8px 0; text-align: right;">
                                <span style="display: inline-block; padding: 4px 12px; background: ${roleInfo.bg}; color: #ffffff; border-radius: 12px; font-size: 12px; font-weight: 600;">${userData.userType}</span>
                              </td>
                            </tr>
                            ${userData.password ? `
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Password:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right; font-family: 'Courier New', monospace;">${userData.password}</td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${userData.password ? `
                    <!-- Auto-Login Notice -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; border-left: 4px solid #10b981;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6; font-weight: 500;">
                            <strong style="font-weight: 600;">✨ Quick Login:</strong> Click the button below and your credentials will be automatically filled in. No typing required!
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: ${roleInfo.bg}; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                            ${userData.password ? '🚀 Login with Auto-Fill' : '🔑 Access System'}
                          </a>
                        </td>
                      </tr>
                    </table>

                    ${userData.password ? `
                    <!-- Security Note -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: 500;">
                            <strong style="font-weight: 600;">🔒 Security Recommendation:</strong> Please change your password after your first login for enhanced security.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Divider -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="height: 1px; background-color: #e2e8f0;"></td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                      Need help? Our support team is here for you.
                    </p>

                    <p style="margin: 24px 0 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                      Best regards,<br>
                      <span style="font-weight: 600; color: #1a202c;">Ticketing System Team</span>
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 32px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                      © ${new Date().getFullYear()} Ticketing System. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

        </table>
      </body>
      </html>
    `;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: TEST_EMAIL, // Always send to your email
      subject: `Account Created - Ticketing System`,
      html: htmlContent,
    });

    if (error) {
      throw new Error(error.message);
    }

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

