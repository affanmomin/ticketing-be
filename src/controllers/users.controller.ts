import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { listAssignableUsers } from '../services/users.service';

export async function usersAssignableCtrl(req: FastifyRequest, reply: FastifyReply) {
  const clientId = (req.query as any).clientId as string;
  return withRlsTx(req, async (tx) => reply.send(await listAssignableUsers(tx, clientId)));
}
