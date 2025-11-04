import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { listPendingNotifications, processPendingNotifications } from '../services/outbox.service';
import { ListOutboxQuery, ProcessOutboxBody } from '../schemas/outbox.schema';
import { unauthorized, forbidden } from '../utils/errors';

export async function listPendingOutboxCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can access outbox');

  const query = ListOutboxQuery.parse(req.query);

  const client = await pool.connect();
  try {
    const result = await listPendingNotifications(client, query.limit);
    return reply.send(result);
  } finally {
    client.release();
  }
}

export async function processOutboxCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can process outbox');

  const body = ProcessOutboxBody.parse(req.body ?? {});

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await processPendingNotifications(client, body.limit);

    await client.query('COMMIT');
    return reply.send(result);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
