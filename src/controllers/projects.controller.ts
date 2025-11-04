import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from '../services/projects.service';
import {
  ListProjectsQuery,
  CreateProjectBody,
  UpdateProjectBody,
  AddProjectMemberBody,
  UpdateProjectMemberBody,
  ProjectMemberParams,
} from '../schemas/projects.schema';
import { IdParam } from '../schemas/common.schema';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * GET /projects - List projects with role-based scoping
 */
export async function listProjectsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListProjectsQuery.parse(req.query);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await listProjects(client, {
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      role: req.user.role,
      clientId: req.user.clientId ?? null,
      filters: { clientId: query.clientId },
      pagination: { limit: query.limit, offset: query.offset },
    });

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
 * GET /projects/:id - Get single project (scoped by role)
 */
export async function getProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: projectId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const project = await getProject(client, projectId, req.user.organizationId);

    // Additional client scope check
    if (req.user.role === 'CLIENT' && project.clientId !== req.user.clientId) {
      throw forbidden('Cannot access projects for other clients');
    }

    await client.query('COMMIT');
    return reply.send(project);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * POST /projects - Create project (ADMIN only)
 */
export async function createProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create projects');

  const body = CreateProjectBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await createProject(
      client,
      req.user.organizationId,
      body.clientId,
      body.name,
      body.description ?? null,
      body.startDate ?? null,
      body.endDate ?? null
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
 * PATCH /projects/:id - Update project (ADMIN only)
 */
export async function updateProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update projects');

  const { id: projectId } = IdParam.parse(req.params);
  const body = UpdateProjectBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateProject(
      client,
      projectId,
      req.user.organizationId,
      {
        name: body.name,
        description: body.description ?? null,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
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

/**
 * GET /projects/:projectId/members - List project members (ADMIN only)
 */
export async function getProjectMembersCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view project members');

  const { id: projectId } = IdParam.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await getProjectMembers(client, projectId, req.user.organizationId);

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
 * POST /projects/:projectId/members - Add project member (ADMIN only)
 */
export async function addProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { id: projectId } = IdParam.parse(req.params);
  const body = AddProjectMemberBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await addProjectMember(
      client,
      projectId,
      body.userId,
      req.user.organizationId,
      body.role,
      body.canRaise,
      body.canBeAssigned
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
 * PATCH /projects/:projectId/members/:userId - Update project member (ADMIN only)
 */
export async function updateProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { projectId, userId } = ProjectMemberParams.parse(req.params);
  const body = UpdateProjectMemberBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await updateProjectMember(
      client,
      projectId,
      userId,
      req.user.organizationId,
      {
        role: body.role,
        canRaise: body.canRaise,
        canBeAssigned: body.canBeAssigned,
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
 * DELETE /projects/:projectId/members/:userId - Remove project member (ADMIN only)
 */
export async function removeProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { projectId, userId } = ProjectMemberParams.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await removeProjectMember(client, projectId, userId, req.user.organizationId);

    await client.query('COMMIT');
    return reply.status(204).send();
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
