import dotenv from 'dotenv';
import { Resend } from 'resend';

// Load environment variables
dotenv.config();

const TEST_EMAIL = process.env.TEST_EMAIL || 'affanmomin14@gmail.com';

async function testEmail() {
  console.log('🧪 Testing Resend email configuration...\n');

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set. Please add it to your environment.');
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  // Send test email
  console.log('📤 Sending test password reset email via Resend...');
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
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || '"Ticketing System" <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: 'Password Reset Request - Ticketing System (Test)',
      html: htmlContent,
      text: `Password Reset Request\n\nHello Test User,\n\nClick this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });

    if (error) {
      console.error('❌ Failed to send email:', error.message);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    if (data?.id) {
      console.log(`   Message ID: ${data.id}`);
    }
    console.log(`   To: ${TEST_EMAIL}`);
    console.log(`   From: ${process.env.SMTP_FROM || 'onboarding@resend.dev'}`);
    console.log('\n📬 Check your inbox (and spam folder if needed).');
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

