import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import {
  listUsers,
  getUserById,
  createEmployee,
  createClientUser,
  updateUser,
  changePassword,
} from '../services/users.service';
import { CreateEmployeeBody, CreateClientUserBody, UpdateUserBody, ListUsersQuery } from '../schemas/users.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * GET /users - List users in organization (ADMIN/EMPLOYEE only)
 */
export async function listUsersCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
    throw forbidden('Only internal users can list users');
  }

  const query = ListUsersQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listUsers(
      client,
      req.user.organizationId,
      {
        userType: query.userType,
        search: query.search,
        isActive: query.isActive,
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
 * GET /users/:id - Get single user by ID
 */
export async function getUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: userId } = IdParam.parse(req.params);

  // Self-access or admin
  if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
    throw forbidden('Can only view own profile');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await getUserById(client, userId, req.user.organizationId);

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
 * POST /employees - Create EMPLOYEE user (ADMIN only)
 */
export async function createEmployeeCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create employees');

  const body = CreateEmployeeBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createEmployee(
      client,
      req.user.organizationId,
      body.email,
      body.fullName,
      body.password
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
 * POST /client-users - Create CLIENT user (ADMIN only)
 */
export async function createClientUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create client users');

  const body = CreateClientUserBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createClientUser(
      client,
      req.user.organizationId,
      body.clientId,
      body.email,
      body.fullName,
      body.password
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
 * PATCH /users/:id - Update user (ADMIN or self-update)
 */
export async function updateUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: userId } = IdParam.parse(req.params);
  const body = UpdateUserBody.parse(req.body);

  // Allow self-update or admin
  if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
    throw forbidden('Can only update own profile');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateUser(
      client,
      userId,
      req.user.organizationId,
      {
        fullName: body.fullName,
        email: body.email,
        isActive: body.isActive,
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
 * POST /users/:id/password - Change password (self only)
 */
export async function changePasswordCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: userId } = IdParam.parse(req.params);
  const { password } = req.body as { password: string };

  // Only self
  if (req.user.userId !== userId) {
    throw forbidden('Can only change own password');
  }

  if (!password || password.length < 8) {
    throw forbidden('Password must be at least 8 characters');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await changePassword(client, userId, password);

    await client.query('COMMIT');
    return reply.send({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
