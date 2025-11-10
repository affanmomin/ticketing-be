import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { listClients, getClient, createClient, updateClient } from '../services/clients.service';
import { CreateClientBody, UpdateClientBody, ListClientsQuery } from '../schemas/clients.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';
import { emailService } from '../services/email.service';

/**
 * GET /clients - List clients in organization (ADMIN only)
 */
export async function listClientsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListClientsQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listClients(
      client,
      req.user.organizationId,
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
 * GET /clients/:id - Get single client (ADMIN only)
 */
export async function getClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view clients');

  const { id: clientId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await getClient(client, clientId, req.user.organizationId);

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
 * POST /clients - Create client (ADMIN only)
 */
export async function createClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create clients');

  const body = CreateClientBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createClient(
      client,
      req.user.organizationId,
      body.name,
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null
    );

    await client.query('COMMIT');

    // Send notification email if client has an email
    if (result.email) {
      await emailService.sendClientNotificationEmail(result.name, result.email);
    }

    return reply.code(201).send(result);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * PATCH /clients/:id - Update client (ADMIN only)
 */
export async function updateClientCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update clients');

  const { id: clientId } = IdParam.parse(req.params);
  const body = UpdateClientBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateClient(
      client,
      clientId,
      req.user.organizationId,
      {
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        active: body.active,
      }
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
