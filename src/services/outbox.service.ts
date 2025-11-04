import { PoolClient } from 'pg';

export interface OutboxResult {
  id: string;
  topic: string;
  ticketId: string;
  recipientUserId: string;
  payload: any;
  attempts: number;
  deliveredAt: Date | null;
  createdAt: Date;
}

export async function listPendingNotifications(
  tx: PoolClient,
  limit: number = 100
): Promise<OutboxResult[]> {
  const { rows } = await tx.query(
    `SELECT id, topic, ticket_id, recipient_user_id, payload, attempts, delivered_at, created_at
     FROM notification_outbox
     WHERE delivered_at IS NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );

  return rows.map(r => ({
    id: r.id,
    topic: r.topic,
    ticketId: r.ticket_id,
    recipientUserId: r.recipient_user_id,
    payload: r.payload,
    attempts: r.attempts,
    deliveredAt: r.delivered_at,
    createdAt: r.created_at,
  }));
}

export async function markDelivered(tx: PoolClient, outboxId: string): Promise<void> {
  await tx.query('UPDATE notification_outbox SET delivered_at = NOW() WHERE id = $1', [outboxId]);
}

export async function incrementAttempts(tx: PoolClient, outboxId: string): Promise<void> {
  await tx.query('UPDATE notification_outbox SET attempts = attempts + 1 WHERE id = $1', [outboxId]);
}

// Placeholder send function
async function sendNotification(_notification: OutboxResult): Promise<void> {
  // TODO: integrate with email/webhook/queue
}

export async function processNotification(
  tx: PoolClient,
  outboxId: string
): Promise<{ success: boolean; error?: string }> {
  const { rows } = await tx.query(
    'SELECT id, topic, ticket_id, recipient_user_id, payload, attempts, delivered_at, created_at FROM notification_outbox WHERE id = $1',
    [outboxId]
  );

  if (rows.length === 0) return { success: false, error: 'Notification not found' };

  const notification: OutboxResult = {
    id: rows[0].id,
    topic: rows[0].topic,
    ticketId: rows[0].ticket_id,
    recipientUserId: rows[0].recipient_user_id,
    payload: rows[0].payload,
    attempts: rows[0].attempts,
    deliveredAt: rows[0].delivered_at,
    createdAt: rows[0].created_at,
  };

  try {
    await sendNotification(notification);
    await markDelivered(tx, outboxId);
    return { success: true };
  } catch (error) {
    await incrementAttempts(tx, outboxId);
    return { success: false, error: (error as Error).message };
  }
}

export async function processPendingNotifications(
  tx: PoolClient,
  limit: number = 10
): Promise<{ processed: number; failed: number }> {
  const notifications = await listPendingNotifications(tx, limit);
  let processed = 0;
  let failed = 0;

  for (const notification of notifications) {
    const result = await processNotification(tx, notification.id);
    if (result.success) processed += 1;
    else failed += 1;
  }

  return { processed, failed };
}
