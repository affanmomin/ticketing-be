import { emailService } from '../src/services/email.service';

/**
 * Script to test all email templates
 * Usage: TEST_EMAIL=your-test@email.com npm run test:all-emails
 * Or: ts-node -r dotenv/config scripts/test-all-email-templates.ts
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'affanmomin14@gmail.com';

// Helper function to add delay between requests (Resend rate limit: 2 requests/second)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllEmailTemplates() {
  console.log('📧 Testing All Email Templates\n');
  console.log(`📬 Test email address: ${TEST_EMAIL}\n`);
  console.log('─'.repeat(60));

  // Test connection first
  console.log('\n1️⃣  Testing email service connection...');
  const isConnected = await emailService.testConnection();
  if (!isConnected) {
    console.error('❌ Email service connection failed. Please check your RESEND_API_KEY.');
    process.exit(1);
  }
  console.log('✅ Email service connected\n');

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  // Test 1: Welcome Email - ADMIN with password
  console.log('2️⃣  Testing Welcome Email (ADMIN with password)...');
  try {
    await emailService.sendWelcomeEmail({
      id: 'test-admin-id',
      email: 'admin@example.com',
      name: 'Test Admin User',
      userType: 'ADMIN',
      password: 'TempPassword123!',
    });
    results.push({ name: 'Welcome Email (ADMIN with password)', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Welcome Email (ADMIN with password)', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 2: Welcome Email - EMPLOYEE with password
  console.log('3️⃣  Testing Welcome Email (EMPLOYEE with password)...');
  try {
    await emailService.sendWelcomeEmail({
      id: 'test-employee-id',
      email: 'employee@example.com',
      name: 'Test Employee User',
      userType: 'EMPLOYEE',
      password: 'TempPassword123!',
    });
    results.push({ name: 'Welcome Email (EMPLOYEE with password)', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Welcome Email (EMPLOYEE with password)', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 3: Welcome Email - CLIENT with password
  console.log('4️⃣  Testing Welcome Email (CLIENT with password)...');
  try {
    await emailService.sendWelcomeEmail({
      id: 'test-client-id',
      email: 'client@example.com',
      name: 'Test Client User',
      userType: 'CLIENT',
      password: 'TempPassword123!',
    });
    results.push({ name: 'Welcome Email (CLIENT with password)', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Welcome Email (CLIENT with password)', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 4: Welcome Email - ADMIN without password
  console.log('5️⃣  Testing Welcome Email (ADMIN without password)...');
  try {
    await emailService.sendWelcomeEmail({
      id: 'test-admin-no-pwd-id',
      email: 'admin-nopwd@example.com',
      name: 'Test Admin User (No Password)',
      userType: 'ADMIN',
    });
    results.push({ name: 'Welcome Email (ADMIN without password)', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Welcome Email (ADMIN without password)', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 5: Client Notification Email
  console.log('6️⃣  Testing Client Notification Email...');
  try {
    await emailService.sendClientNotificationEmail(
      'Test Client Organization',
      'client-org@example.com'
    );
    results.push({ name: 'Client Notification Email', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Client Notification Email', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 6: Password Reset Email
  console.log('7️⃣  Testing Password Reset Email...');
  try {
    await emailService.sendPasswordResetEmail(
      'user@example.com',
      'Test User',
      'test-reset-token-12345-abcdef'
    );
    results.push({ name: 'Password Reset Email', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Password Reset Email', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Test 7: Ticket Created Email
  console.log('8️⃣  Testing Ticket Created Email...');
  try {
    await emailService.sendTicketCreatedEmail(
      'assignee@example.com',
      'Test Assignee',
      'Fix critical bug in authentication system',
      'This is a test ticket description that needs immediate attention.',
      'Test Requester',
      'Test Project',
      'ticket-123'
    );
    results.push({ name: 'Ticket Created Email', success: true });
    console.log('✅ Sent successfully\n');
    await delay(600); // Rate limit: 2 requests/second
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name: 'Ticket Created Email', success: false, error: errorMessage });
    console.error(`❌ Failed: ${errorMessage}\n`);
    await delay(600);
  }

  // Summary
  console.log('─'.repeat(60));
  console.log('\n📊 Test Summary:\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n📈 Results: ${successful} successful, ${failed} failed out of ${results.length} tests\n`);

  if (failed === 0) {
    console.log('🎉 All email templates tested successfully!');
    console.log(`📬 Check your inbox at ${TEST_EMAIL}`);
    console.log('   (Also check spam/junk folder if not in inbox)\n');
  } else {
    console.log('⚠️  Some email templates failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run the script
testAllEmailTemplates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

