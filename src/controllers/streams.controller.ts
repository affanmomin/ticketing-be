import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import {
  listStreams,
  getStream,
  createStream,
  updateStream,
  listParentStreams,
  listChildStreams
} from '../services/streams.service';
import { ListStreamsQuery, CreateStreamBody, UpdateStreamBody } from '../schemas/streams.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * GET /projects/:id/streams - List streams for a project (ADMIN only)
 */
export async function listStreamsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');

  const { id: projectId } = IdParam.parse(req.params);
  const query = ListStreamsQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listStreams(
      client,
      projectId,
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
 * GET /streams/:id - Get single stream (ADMIN only)
 */
export async function getStreamCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view streams');

  const { id: streamId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await getStream(client, streamId, req.user.organizationId);

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
 * POST /projects/:id/streams - Create stream (ADMIN only)
 */
export async function createStreamCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create streams');

  const { id: projectId } = IdParam.parse(req.params);
  const body = CreateStreamBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createStream(
      client,
      req.user.organizationId,
      projectId,
      body.name,
      body.description ?? null,
      body.parentStreamId ?? null
    );

    await client.query('COMMIT');
    return reply.code(201).send(result);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * PATCH /streams/:id - Update stream (ADMIN only)
 */
export async function updateStreamCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update streams');

  const { id: streamId } = IdParam.parse(req.params);
  const body = UpdateStreamBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateStream(
      client,
      streamId,
      req.user.organizationId,
      {
        name: body.name,
        description: body.description ?? null,
        active: body.active,
        parentStreamId: body.parentStreamId ?? null,
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

/**
 * GET /projects/:id/streams/parents - List parent streams only (ADMIN only)
 * For first dropdown
 */
export async function listParentStreamsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');

  const { id: projectId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listParentStreams(
      client,
      projectId,
      req.user.organizationId
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
 * GET /streams/:id/children - List child streams for a parent (ADMIN only)
 * For second dropdown
 */
export async function listChildStreamsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');

  const { id: parentStreamId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listChildStreams(
      client,
      parentStreamId,
      req.user.organizationId
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
