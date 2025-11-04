import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { listPriorities, listStatuses } from '../services/tags.service';
import { unauthorized } from '../utils/errors';

export async function listPrioritiesCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const client = await pool.connect();
  try {
    const result = await listPriorities(client);
    return reply.send(result);
  } finally {
    client.release();
  }
}

export async function listStatusesCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const client = await pool.connect();
  try {
    const result = await listStatuses(client);
    return reply.send(result);
  } finally {
    client.release();
  }
}
