import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { TicketFilterQuery, CreateTicketBody, UpdateTicketBody } from '../schemas/tickets.schema';
import { listTickets, getTicket, createTicket, updateTicket } from '../services/tickets.service';

export async function getTicketsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const q = TicketFilterQuery.parse(req.query);
  return withRlsTx(req, async (tx) => {
    const items = await listTickets(tx, q);
    return reply.send({ items, count: items.length });
  });
}

export async function getTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await getTicket(tx, id)));
}

export async function createTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateTicketBody.parse(req.body);
  return withRlsTx(req, async (tx) =>
    reply.code(201).send(await createTicket(tx, body, { userId: req.auth!.userId, tenantId: req.auth!.tenantId })),
  );
}

export async function updateTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await updateTicket(tx, { ...(req.body as any), id }, req.auth!.role)));
}
