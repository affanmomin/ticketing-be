import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { AddCommentBody } from '../schemas/comments.schema';
import { addComment, listComments } from '../services/comments.service';

export async function listCommentsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const ticketId = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await listComments(tx, ticketId)));
}

export async function addCommentCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = AddCommentBody.parse(req.body);
  return withRlsTx(req, async (tx) =>
    reply.code(201).send(await addComment(tx, body, req.auth!.userId, req.auth!.tenantId)),
  );
}
