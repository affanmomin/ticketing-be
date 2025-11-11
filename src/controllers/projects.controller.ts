import { FastifyRequest, FastifyReply } from 'fastify';
import { withReadOnly, withTransaction } from '../db/helpers';
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
 * Read-only operation - no transaction needed
 */
export async function listProjectsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = ListProjectsQuery.parse(req.query);

  const result = await withReadOnly(async (client) => {
    return await listProjects(client, {
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      role: req.user!.role,
      clientId: req.user!.clientId ?? null,
      filters: { clientId: query.clientId },
      pagination: { limit: query.limit, offset: query.offset },
    });
  });

  return reply.send(result);
}

/**
 * GET /projects/:id - Get single project (scoped by role)
 * Read-only operation - no transaction needed
 */
export async function getProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: projectId } = IdParam.parse(req.params);

  const project = await withReadOnly(async (client) => {
    return await getProject(client, projectId, req.user!.organizationId);
  });

  // // Additional client scope check
  // if (req.user.role === 'CLIENT' && project.clientId !== req.user.clientId) {
  //   throw forbidden('Cannot access projects for other clients');
  // }

  return reply.send(project);
}

/**
 * POST /projects - Create project (ADMIN only)
 * Write operation - transaction required
 */
export async function createProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create projects');

  const body = CreateProjectBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await createProject(
      client,
      req.user!.organizationId,
      body.clientId,
      body.name,
      body.description ?? null,
      body.startDate ?? null,
      body.endDate ?? null
    );
  });

  return reply.code(201).send(result);
}

/**
 * PATCH /projects/:id - Update project (ADMIN only)
 * Write operation - transaction required
 */
export async function updateProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update projects');

  const { id: projectId } = IdParam.parse(req.params);
  const body = UpdateProjectBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await updateProject(
      client,
      projectId,
      req.user!.organizationId,
      {
        name: body.name,
        description: body.description ?? null,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        active: body.active,
      }
    );
  });

  return reply.send(result);
}

/**
 * GET /projects/:projectId/members - List project members (ADMIN only)
 * Read-only operation - no transaction needed
 */
export async function getProjectMembersCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view project members');

  const { id: projectId } = IdParam.parse(req.params);

  const result = await withReadOnly(async (client) => {
    return await getProjectMembers(client, projectId, req.user!.organizationId);
  });

  return reply.send(result);
}

/**
 * POST /projects/:projectId/members - Add project member (ADMIN only)
 * Write operation - transaction required
 */
export async function addProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { id: projectId } = IdParam.parse(req.params);
  const body = AddProjectMemberBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await addProjectMember(
      client,
      projectId,
      body.userId,
      req.user!.organizationId,
      body.role,
      body.canRaise,
      body.canBeAssigned
    );
  });

  return reply.code(201).send(result);
}

/**
 * PATCH /projects/:projectId/members/:userId - Update project member (ADMIN only)
 * Write operation - transaction required
 */
export async function updateProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { projectId, userId } = ProjectMemberParams.parse(req.params);
  const body = UpdateProjectMemberBody.parse(req.body);

  const result = await withTransaction(async (client) => {
    return await updateProjectMember(
      client,
      projectId,
      userId,
      req.user!.organizationId,
      {
        role: body.role,
        canRaise: body.canRaise,
        canBeAssigned: body.canBeAssigned,
      }
    );
  });

  return reply.send(result);
}

/**
 * DELETE /projects/:projectId/members/:userId - Remove project member (ADMIN only)
 * Write operation - transaction required
 */
export async function removeProjectMemberCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can manage project members');

  const { projectId, userId } = ProjectMemberParams.parse(req.params);

  await withTransaction(async (client) => {
    await removeProjectMember(client, projectId, userId, req.user!.organizationId);
  });

  return reply.status(204).send();
}
