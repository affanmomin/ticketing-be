import { FastifyRequest, FastifyReply } from 'fastify';
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../services/tickets.service';
import { uploadAttachment } from '../services/attachments.service';
import { ListTicketsQuery, CreateTicketBody, CreateTicketBodyT, UpdateTicketBody } from '../schemas/tickets.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized, badRequest } from '../utils/errors';
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
 * POST /tickets - Create ticket (with optional attachments)
 * Write operation - transaction required
 * Supports both JSON and multipart/form-data
 */
export async function createTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  // Check if this is multipart/form-data (has files) or JSON
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');

  let ticketData: CreateTicketBodyT;
  const attachments: Array<{ fileName: string; mimeType: string; data: Buffer }> = [];

  if (isMultipart && req.parts) {
    // Handle multipart/form-data
    const parts = req.parts();
    const formFields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // Handle file attachment
        const fileData = await part.toBuffer();
        attachments.push({
          fileName: part.filename || 'unnamed',
          mimeType: part.mimetype || 'application/octet-stream',
          data: fileData,
        });
      } else {
        // Handle form field
        formFields[part.fieldname] = part.value as string;
      }
    }

    // Validate and parse form fields
    ticketData = CreateTicketBody.parse({
      projectId: formFields.projectId,
      streamId: formFields.streamId,
      subjectId: formFields.subjectId,
      priorityId: formFields.priorityId,
      statusId: formFields.statusId,
      title: formFields.title,
      descriptionMd: formFields.descriptionMd || undefined,
      assignedToUserId: formFields.assignedToUserId || undefined,
    });
  } else {
    // Handle JSON body (backward compatible)
    ticketData = CreateTicketBody.parse(req.body);
  }

  const ticket = await withTransaction(async (client) => {
    // Create the ticket first
    const createdTicket = await createTicket(
      client,
      ticketData.projectId,
      req.user!.userId,
      ticketData.streamId,
      ticketData.subjectId,
      ticketData.priorityId,
      ticketData.statusId,
      ticketData.title,
      ticketData.descriptionMd ?? null,
      ticketData.assignedToUserId ?? null
    );

    // Upload attachments if any
    const uploadedAttachments = [];
    for (const attachment of attachments) {
      const uploaded = await uploadAttachment(
        client,
        createdTicket.id,
        req.user!.userId,
        attachment.fileName,
        attachment.mimeType,
        attachment.data
      );
      uploadedAttachments.push(uploaded);
    }

    return {
      ...createdTicket,
      attachments: uploadedAttachments,
    };
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
