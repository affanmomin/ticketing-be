import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
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

/**
 * GET /tickets - List tickets with role-based scoping
 */
export async function listTicketsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListTicketsQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listTickets(
      client,
      req.user.organizationId,
      req.user.role,
      req.user.userId,
      req.user.clientId ?? null,
      {
        projectId: query.projectId,
        statusId: query.statusId,
        priorityId: query.priorityId,
        assigneeId: query.assigneeId,
      },
      query.limit,
      query.offset
    );

    await client.query('COMMIT');
    return reply.send(result);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * GET /tickets/:id - Get ticket details (scoped by role)
 */
export async function getTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await getTicket(client, ticketId);

    await client.query('COMMIT');
    return reply.send(ticket);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * POST /tickets - Create ticket
 */
export async function createTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const body = CreateTicketBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await createTicket(
      client,
      body.projectId,
      req.user.userId,
      body.streamId,
      body.subjectId,
      body.priorityId,
      body.statusId,
      body.title,
      body.descriptionMd ?? null,
      body.assignedToUserId ?? null
    );

    await client.query('COMMIT');
    return reply.code(201).send(ticket);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * PATCH /tickets/:id - Update ticket
 */
export async function updateTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = IdParam.parse(req.params);
  const body = UpdateTicketBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await updateTicket(
      client,
      ticketId,
      {
        statusId: body.statusId,
        priorityId: body.priorityId,
        assignedToUserId: body.assignedToUserId ?? undefined,
        title: body.title,
        descriptionMd: body.descriptionMd,
      },
      req.user.userId
    );

    await client.query('COMMIT');
    return reply.send(ticket);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * DELETE /tickets/:id - Soft delete ticket (ADMIN only for now)
 */
export async function deleteTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
    throw forbidden('Only internal users can delete tickets');
  }

  const { id: ticketId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await deleteTicket(client, ticketId, req.user.userId);

    await client.query('COMMIT');
    return reply.status(204).send();
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
