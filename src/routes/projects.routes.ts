import { FastifyInstance } from 'fastify';
import {
  listProjectsCtrl,
  getProjectCtrl,
  createProjectCtrl,
  updateProjectCtrl,
  getProjectMembersCtrl,
  addProjectMemberCtrl,
  updateProjectMemberCtrl,
  removeProjectMemberCtrl,
} from '../controllers/projects.controller';
import {
  ListProjectsQuery,
  CreateProjectBody,
  UpdateProjectBody,
  AddProjectMemberBody,
  UpdateProjectMemberBody,
  ProjectMemberParams,
} from '../schemas/projects.schema';
import { IdParam } from '../schemas/common.schema';

export default async function projectsRoutes(app: FastifyInstance) {
  app.get('/projects', { schema: { querystring: ListProjectsQuery } }, listProjectsCtrl);
  app.get('/projects/:id', { schema: { params: IdParam } }, getProjectCtrl);
  app.post('/projects', { schema: { body: CreateProjectBody } }, createProjectCtrl);
  app.post('/projects/:id', { schema: { params: IdParam, body: UpdateProjectBody } }, updateProjectCtrl);

  app.get('/projects/:id/members', { schema: { params: IdParam } }, getProjectMembersCtrl);
  app.post('/projects/:id/members', { schema: { params: IdParam, body: AddProjectMemberBody } }, addProjectMemberCtrl);
  app.post('/projects/:projectId/members/:userId', { schema: { params: ProjectMemberParams, body: UpdateProjectMemberBody } }, updateProjectMemberCtrl);
  app.delete('/projects/:projectId/members/:userId', { schema: { params: ProjectMemberParams } }, removeProjectMemberCtrl);
}
