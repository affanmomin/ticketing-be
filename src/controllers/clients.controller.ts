import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { parseLimitOffset } from '../utils/pagination';
import { CreateClientBody, UpdateClientBody } from '../schemas/clients.schema';
import { createClient, getClient, listClients, mapEmployeeToClient, updateClient } from '../services/clients.service';

export async function listClientsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const { limit, offset } = parseLimitOffset(req.query);
  return withRlsTx(req, async (tx) => {
    const rows = await listClients(tx, { limit, offset }, req.auth!.role as any, req.auth!.clientId);
    return reply.send({ items: rows, count: rows.length });
  });
}

export async function getClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await getClient(tx, id)));
}

export async function createClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateClientBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.code(201).send(await createClient(tx, body, req.auth!.tenantId)));
}

export async function updateClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const body = UpdateClientBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.send(await updateClient(tx, id, body)));
}

export async function mapEmployeeCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const { userId } = req.body as any;
  return withRlsTx(req, async (tx) => reply.send(await mapEmployeeToClient(tx, userId, id, req.auth!.tenantId)));
}
