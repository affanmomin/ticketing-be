import { pool } from './db/pool';
import server from './server';
import { startNotificationProcessor } from './jobs/notification-processor';
import { emailService } from './services/email.service';

const port = Number(process.env.PORT) || 3000;
async function connectDB() {
  try {
    console.log('Connecting to Supabase PostgreSQL...');
    // Test connection by getting a client from the pool
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    console.log('Connected to Supabase PostgreSQL!');
  } catch (err) {
    console.error('Connection error:', err);
  }
}

async function verifyEmailService() {
  try {
    console.log('Verifying email service connection...');
    // Don't block server startup if email verification fails
    // Run verification in background with timeout
    const timeoutMs = 20000; // 20 seconds max
    const verificationPromise = emailService.testConnection();
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('⚠️  Email verification timed out. Server will start anyway.');
        console.warn('   Emails may not work if SMTP is blocked by your hosting provider.');
        resolve(false);
      }, timeoutMs);
    });

    const isConnected = await Promise.race([verificationPromise, timeoutPromise]);
    if (isConnected) {
      console.log('✅ Email service connection verified successfully');
    } else {
      console.warn('⚠️  Email service connection verification failed. Emails may not send.');
      console.warn('   The server will continue to run, but email functionality may be unavailable.');
    }
  } catch (err) {
    console.error('❌ Email service verification error:', err);
    console.warn('⚠️  Email service may not work correctly. Check SMTP configuration.');
    console.warn('   Server will continue to run despite email verification failure.');
  }
}

connectDB();
verifyEmailService();

startNotificationProcessor();

server.listen(
  {
    port,
    host: '0.0.0.0',
  },
  (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }

    server.log.info(`Server running on ${address}`);
  }
);
