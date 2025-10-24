import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { CreateStreamBody, UpdateStreamBody } from '../schemas/streams.schema';
import { createStream, listStreams, updateStream } from '../services/streams.service';

export async function listStreamsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const projectId = (req.query as any).projectId as string;
  return withRlsTx(req, async (tx) => reply.send(await listStreams(tx, projectId)));
}

export async function createStreamCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateStreamBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.code(201).send(await createStream(tx, body, req.auth!.tenantId)));
}

export async function updateStreamCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const body = UpdateStreamBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.send(await updateStream(tx, id, body)));
}
