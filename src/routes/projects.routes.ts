import { FastifyInstance } from 'fastify';
import { listProjectsCtrl, getProjectCtrl, createProjectCtrl, updateProjectCtrl } from '../controllers/projects.controller';

export default async function projectsRoutes(app: FastifyInstance) {
  app.get('/projects', listProjectsCtrl);
  app.get('/projects/:id', getProjectCtrl);
  app.post('/projects', createProjectCtrl);
  app.patch('/projects/:id', updateProjectCtrl);
}
