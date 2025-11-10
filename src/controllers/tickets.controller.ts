import { FastifyRequest, FastifyReply } from 'fastify';
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../services/tickets.service';
import { ListTicketsQuery, CreateTicketBody, UpdateTicketBody } from '../schemas/tickets.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';
import { withReadOnly, withTransaction } from '../db/helpers';

/**
 * GET /tickets - List tickets with role-based scoping
 * Read-only operation - no transaction needed
 */
export async function listTicketsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListTicketsQuery.parse(req.query);

  const result = await withReadOnly(async (client) => {
    return await listTickets(
      client,
      req.user!.organizationId,
      req.user!.role,
      req.user!.userId,
      req.user!.clientId ?? null,
      {
        projectId: query.projectId,
        statusId: query.statusId,
        priorityId: query.priorityId,
        assigneeId: query.assigneeId,
      },
      query.limit,
      query.offset
    );
  });

  return reply.send(result);
}

/**
 * GET /tickets/:id - Get ticket details (scoped by role)
 * Read-only operation - no transaction needed
 */
export async function getTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);

  const ticket = await withReadOnly(async (client) => {
    return await getTicket(client, ticketId, req.user!.role, req.user!.userId, req.user!.clientId ?? null);
  });

  return reply.send(ticket);
}

/**
 * POST /tickets - Create ticket
 * Write operation - transaction required
 */
export async function createTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const body = CreateTicketBody.parse(req.body);

  const ticket = await withTransaction(async (client) => {
    return await createTicket(
      client,
      body.projectId,
      req.user!.userId,
      body.streamId,
      body.subjectId,
      body.priorityId,
      body.statusId,
      body.title,
      body.descriptionMd ?? null,
      body.assignedToUserId ?? null
    );
  });

  return reply.code(201).send(ticket);
}

/**
 * PATCH /tickets/:id - Update ticket
 * Write operation - transaction required
 */
export async function updateTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);
  const body = UpdateTicketBody.parse(req.body);

  const ticket = await withTransaction(async (client) => {
    return await updateTicket(
      client,
      ticketId,
      {
        statusId: body.statusId,
        priorityId: body.priorityId,
        assignedToUserId: body.assignedToUserId ?? undefined,
        title: body.title,
        descriptionMd: body.descriptionMd,
      },
      req.user!.userId
    );
  });

  return reply.send(ticket);
}

/**
 * DELETE /tickets/:id - Soft delete ticket (ADMIN only for now)
 * Write operation - transaction required
 */
export async function deleteTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
    throw forbidden('Only internal users can delete tickets');
  }

  const { id: ticketId } = IdParam.parse(req.params);

  await withTransaction(async (client) => {
    await deleteTicket(client, ticketId, req.user!.userId);
  });

  return reply.status(204).send();
}
