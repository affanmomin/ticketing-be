import client from './db/pool';
import server from './server';

const port = Number(process.env.PORT) || 3000;
async function connectDB() {
  try {
    console.log("Connecting to Supabase PostgreSQL...");
    await client.connect();
    console.log("Connected to Supabase PostgreSQL!");
  } catch (err) {
    console.error("Connection error:", err);
  }
}

connectDB();

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
  },
);
