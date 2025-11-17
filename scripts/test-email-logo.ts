/**
 * Test email with logo to verify logo display
 * Run: npx ts-node -r dotenv/config scripts/test-email-logo.ts
 */

import dotenv from 'dotenv';
import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const TEST_EMAIL = 'affanmomin14@gmail.com';

async function testEmailLogo() {
  console.log('🧪 Testing Email with Logo...\n');

  // Load logo for CID attachment
  let logoBuffer: Buffer;
  try {
    const logoPath = join(__dirname, '../saait-logo.jpg');
    logoBuffer = readFileSync(logoPath);
    console.log('✅ Logo loaded successfully');
    console.log(`   Size: ${(logoBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error: any) {
    console.error('❌ Failed to load logo:', error.message);
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set. Please add it to your environment.');
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  // Send test email with logo
  console.log('📤 Sending test email with logo via Resend...');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Logo Test - Sahra-Al-Aman Information Technology (SAAIT)</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; padding: 40px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- Header -->
        <tr>
          <td style="background-color: #1a1a1a; padding: 32px 40px; text-align: center;">
            <img src="cid:logo" alt="SAAIT Logo" style="width: 120px; height: auto; margin: 0 auto 20px; display: block; max-width: 120px;" />
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.3px;">Sahra-Al-Aman Information Technology (SAAIT)</h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 48px 40px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Logo Test Email</h2>

            <p style="margin: 0 0 32px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
              This is a test email to verify that the SAAIT logo displays correctly in email clients.
            </p>

            <p style="margin: 0 0 32px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
              The logo above should be visible. If you can see it, the logo integration is working correctly!
            </p>

            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 32px 0;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                <strong>Logo Details:</strong><br>
                • Format: JPEG<br>
                • Embedded as: CID Attachment (cid:logo)<br>
                • Display size: 120px width<br>
                • This method works reliably across all email clients
              </p>
            </div>

            <p style="margin: 32px 0 0 0; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
              Best regards,<br>
              <span style="font-weight: 500;">Sahra-Al-Aman Information Technology (SAAIT) Team</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e0e0e0; text-align: center;">
            <img src="cid:logo" alt="SAAIT Logo" style="width: 80px; height: auto; margin: 0 auto 16px; display: block; max-width: 80px; opacity: 0.7;" />
            <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px; line-height: 1.5;">
              This is an automated test message. Please do not reply to this email.
            </p>
            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
              © ${new Date().getFullYear()} Sahra-Al-Aman Information Technology (SAAIT). All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: 'Logo Test - Sahra-Al-Aman Information Technology (SAAIT)',
      html: htmlContent,
      text: `Logo Test Email\n\nThis is a test email to verify that the SAAIT logo displays correctly.\n\nThe logo should be visible in the HTML version of this email.\n\nBest regards,\nSahra-Al-Aman Information Technology (SAAIT) Team`,
      attachments: [{
        filename: 'saait-logo.jpg',
        content: logoBuffer,
        content_id: 'logo',
        content_type: 'image/jpeg',
      }],
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
    console.log('\n📬 Check your inbox at affanmomin14@gmail.com');
    console.log('   (Also check spam/junk folder if not in inbox)');
    console.log('\n💡 The logo should be visible in both the header and footer of the email.');
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

testEmailLogo()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

