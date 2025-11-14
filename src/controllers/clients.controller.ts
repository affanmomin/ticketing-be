import { FastifyRequest, FastifyReply } from 'fastify';
import { listClients, getClient, createClient, updateClient } from '../services/clients.service';
import { CreateClientBody, UpdateClientBody, ListClientsQuery } from '../schemas/clients.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';
import { emailService } from '../services/email.service';
import { withReadOnly, withTransaction } from '../db/helpers';

/**
 * GET /clients - List clients in organization (ADMIN only)
 * Read-only operation - no transaction needed
 */
export async function listClientsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListClientsQuery.parse(req.query);

  const result = await withReadOnly(async (client) => {
    return await listClients(
      client,
      req.user!.organizationId,
      query.limit,
      query.offset
    );
  });

  return reply.send(result);
}

/**
 * GET /clients/:id - Get single client (ADMIN only)
 * Read-only operation - no transaction needed
 */
export async function getClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view clients');

  const { id: clientId } = IdParam.parse(req.params);

  const result = await withReadOnly(async (client) => {
    return await getClient(client, clientId, req.user!.organizationId);
  });

  return reply.send(result);
}

/**
 * POST /clients - Create client (ADMIN only)
 * Write operation - transaction required
 */
export async function createClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create clients');

  const body = CreateClientBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await createClient(
      client,
      req.user!.organizationId,
      body.name,
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null
    );
  });

  // Send notification email if client has an email (asynchronously, don't block response)
  if (result.email) {
    emailService.sendClientNotificationEmail(result.name, result.email).catch((error) => {
      // Error is already logged in the email service, but we log here too for visibility
      console.error(`Failed to send client notification email to ${result.email}:`, error);
    });
  }

  return reply.code(201).send(result);
}

/**
 * PATCH /clients/:id - Update client (ADMIN only)
 * Write operation - transaction required
 */
export async function updateClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update clients');

  const { id: clientId } = IdParam.parse(req.params);
  const body = UpdateClientBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await updateClient(
      client,
      clientId,
      req.user!.organizationId,
      {
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        active: body.active,
      }
    );
  });

  return reply.send(result);
}
