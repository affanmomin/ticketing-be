import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { CreateProjectBody, UpdateProjectBody } from '../schemas/projects.schema';
import { createProject, getProject, listProjects, updateProject } from '../services/projects.service';

export async function listProjectsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const clientId = (req.query as any).clientId as string | undefined;
  return withRlsTx(req, async (tx) => reply.send(await listProjects(tx, clientId)));
}

export async function getProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await getProject(tx, id)));
}

export async function createProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateProjectBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.code(201).send(await createProject(tx, body, req.auth!.tenantId)));
}

export async function updateProjectCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const body = UpdateProjectBody.parse(req.body);
  return withRlsTx(req, async (tx) => reply.send(await updateProject(tx, id, body)));
}
