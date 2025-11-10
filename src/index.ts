import { pool } from './db/pool';
import server from './server';
import { startNotificationProcessor } from './jobs/notification-processor';

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

connectDB();

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
