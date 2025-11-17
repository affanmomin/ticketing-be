import 'dotenv/config';
import { emailService } from '../src/services/email.service';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TEST_EMAIL = process.env.TEST_EMAIL || 'affanmomin14@gmail.com';

async function main() {
  console.log(`📬 Using test inbox: ${TEST_EMAIL}\n`);

  console.log('1️⃣  Sending welcome email...');
  await emailService.sendWelcomeEmail({
    id: 'test-user-id',
    email: TEST_EMAIL,
    name: 'Test Employee',
    userType: 'EMPLOYEE',
    password: 'TempPass123!',
  });
  console.log('✅ Welcome email sent\n');
  await pause(800);

  console.log('2️⃣  Sending client notification email...');
  await emailService.sendClientNotificationEmail('Acme Corp', TEST_EMAIL);
  console.log('✅ Client notification email sent\n');
  await pause(800);

  console.log('3️⃣  Sending password reset email...');
  await emailService.sendPasswordResetEmail(TEST_EMAIL, 'Test Employee', 'test-reset-token');
  console.log('✅ Password reset email sent\n');
  await pause(800);

  console.log('4️⃣  Sending ticket assignment email...');
  await emailService.sendTicketCreatedEmail(
    TEST_EMAIL,
    'Test Employee',
    'Sample Ticket Title',
    'Ticket description here',
    'Admin User',
    'Core Platform',
    'ticket-123',
  );
  console.log('✅ Ticket assignment email sent\n');

  console.log('🎉 All sample emails have been queued via Resend!');
  console.log('   Check your inbox (and spam/junk) for verification.');
}

main().catch((error) => {
  console.error('❌ Failed to send test emails:', error);
  process.exit(1);
});

