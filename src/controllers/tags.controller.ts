import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { CreateTagBody } from '../schemas/tags.schema';
import { createTag, deleteTag, listTags } from '../services/tags.service';

export async function listTagsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const clientId = (req.query as any).clientId as string | undefined;
  return withRlsTx(req, async (tx) => reply.send(await listTags(tx, clientId)));
}

export async function createTagCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateTagBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.code(201).send(await createTag(tx, body, req.auth!.tenantId)));
}

export async function deleteTagCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await deleteTag(tx, id)));
}
