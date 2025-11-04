import { pool } from '../db/pool';
import { processPendingNotifications } from '../services/outbox.service';

let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startNotificationProcessor(intervalMs: number = 60_000) {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await processPendingNotifications(client, 10);
      await client.query('COMMIT');
      if (result.processed || result.failed) {
        console.log(`[outbox] processed=${result.processed} failed=${result.failed}`);
      }
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      console.error('[outbox] processing error', error);
    } finally {
      client.release();
      isProcessing = false;
    }
  }, intervalMs);
}

export function stopNotificationProcessor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
