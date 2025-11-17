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
    const isConnected = await emailService.testConnection();
    if (isConnected) {
      console.log('✅ Email service connection verified successfully');
    } else {
      console.warn('⚠️  Email service connection verification failed. Emails may not send.');
    }
  } catch (err) {
    console.error('❌ Email service verification error:', err);
    console.warn('⚠️  Email service may not work correctly. Check SMTP configuration.');
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
