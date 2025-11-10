import { FastifyRequest, FastifyReply } from 'fastify';
import { listComments, createComment, getComment } from '../services/comments.service';
import { CreateCommentBody } from '../schemas/comments.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';
import { withReadOnly, withTransaction } from '../db/helpers';

/**
 * GET /tickets/:ticketId/comments
 * Read-only operation - no transaction needed
 */
export async function listCommentsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);

  const comments = await withReadOnly(async (client) => {
    return await listComments(client, ticketId, req.user!.role);
  });

  return reply.send(comments);
}

/**
 * GET /comments/:id
 * Read-only operation - no transaction needed
 */
export async function getCommentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: commentId } = IdParam.parse(req.params);

  const comment = await withReadOnly(async (client) => {
    return await getComment(client, commentId, req.user!.role);
  });

  return reply.send(comment);
}

/**
 * POST /tickets/:ticketId/comments
 * Write operation - transaction required
 */
export async function createCommentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);
  const body = CreateCommentBody.parse(req.body);

  // CLIENT users cannot create INTERNAL comments (enforced in service but quick check)
  if (req.user.role === 'CLIENT' && body.visibility === 'INTERNAL') {
    throw forbidden('CLIENT users can only create PUBLIC comments');
  }

  const comment = await withTransaction(async (client) => {
    return await createComment(
      client,
      ticketId,
      req.user!.userId,
      req.user!.role,
      body.visibility,
      body.bodyMd
    );
  });

  return reply.code(201).send(comment);
}
