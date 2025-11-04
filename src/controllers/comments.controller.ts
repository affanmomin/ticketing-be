import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { listComments, createComment, getComment } from '../services/comments.service';
import { CreateCommentBody } from '../schemas/comments.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * GET /tickets/:ticketId/comments
 */
export async function listCommentsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comments = await listComments(client, ticketId, req.user.role);

    await client.query('COMMIT');
    return reply.send(comments);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * GET /comments/:id
 */
export async function getCommentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: commentId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comment = await getComment(client, commentId, req.user.role);

    await client.query('COMMIT');
    return reply.send(comment);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * POST /tickets/:ticketId/comments
 */
export async function createCommentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);
  const body = CreateCommentBody.parse(req.body);

  // CLIENT users cannot create INTERNAL comments (enforced in service but quick check)
  if (req.user.role === 'CLIENT' && body.visibility === 'INTERNAL') {
    throw forbidden('CLIENT users can only create PUBLIC comments');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comment = await createComment(
      client,
      ticketId,
      req.user.userId,
      req.user.role,
      body.visibility,
      body.bodyMd
    );

    await client.query('COMMIT');
    return reply.code(201).send(comment);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
