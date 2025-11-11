import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TEST_EMAIL = 'affanmomin14@gmail.com';

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Test connection
  console.log('1️⃣  Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');
  } catch (error: any) {
    console.error('❌ SMTP connection failed:', error.message);
    process.exit(1);
  }

  // Send test email
  console.log('2️⃣  Sending test password reset email...');
  const resetToken = 'test-token-1234567890abcdef';
  const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Ticketing System</title>
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
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
            
            <p style="margin: 0 0 32px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
              Hello Test User,
            </p>

            <p style="margin: 0 0 32px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0;">
              <tr>
                <td align="left">
                  <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 500; border-radius: 2px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>

            <!-- Alternative Link -->
            <div style="background-color: #f8f9fa; border-left: 3px solid #495057; padding: 16px 20px; margin: 0 0 32px 0;">
              <p style="margin: 0 0 8px 0; color: #495057; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Or copy and paste this link:</p>
              <p style="margin: 0; color: #495057; font-size: 13px; line-height: 1.5; word-break: break-all;">
                <a href="${resetUrl}" style="color: #1a1a1a; text-decoration: underline;">${resetUrl}</a>
              </p>
            </div>

            <!-- Security Note -->
            <div style="background-color: #fff3cd; border-left: 3px solid #ffc107; padding: 16px 20px; margin: 0 0 32px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>

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
              This password reset link will expire in 1 hour for security reasons.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Ticketing System" <noreply@example.com>',
      to: TEST_EMAIL,
      subject: 'Password Reset Request - Ticketing System (Test)',
      html: htmlContent,
      text: `Password Reset Request\n\nHello Test User,\n\nClick this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${TEST_EMAIL}`);
    console.log(`   From: ${process.env.SMTP_FROM || 'noreply@example.com'}`);
    console.log('\n📬 Check your inbox at affanmomin14@gmail.com');
    console.log('   (Also check spam/junk folder if not in inbox)');
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

testEmail()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

