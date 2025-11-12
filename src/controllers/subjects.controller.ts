import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { listSubjects, getSubject, createSubject, updateSubject } from '../services/subjects.service';
import { ListSubjectsQuery, CreateSubjectBody, UpdateSubjectBody } from '../schemas/subjects.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';

export async function listSubjectsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list subjects');

  const { id: projectId } = IdParam.parse(req.params);
  const query = ListSubjectsQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listSubjects(
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

export async function getSubjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view subjects');

  const { id: subjectId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await getSubject(client, subjectId, req.user.organizationId);

    await client.query('COMMIT');
    return reply.send(result);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function createSubjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create subjects');

  const { id: projectId } = IdParam.parse(req.params);
  const body = CreateSubjectBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createSubject(
      client,
      req.user.organizationId,
      projectId,
      body.name,
      body.description ?? null
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

export async function updateSubjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update subjects');

  const { id: subjectId } = IdParam.parse(req.params);
  const body = UpdateSubjectBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateSubject(
      client,
      subjectId,
      req.user.organizationId,
      {
        name: body.name,
        description: body.description ?? null,
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
