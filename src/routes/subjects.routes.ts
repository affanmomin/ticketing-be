import { FastifyInstance } from 'fastify';
import {
  listSubjectsCtrl,
  getSubjectCtrl,
  createSubjectCtrl,
  updateSubjectCtrl,
} from '../controllers/subjects.controller';
import { ListSubjectsQuery, CreateSubjectBody, UpdateSubjectBody } from '../schemas/subjects.schema';
import { IdParam } from '../schemas/common.schema';

export default async function subjectsRoutes(app: FastifyInstance) {
  app.get('/clients/:id/subjects', { schema: { params: IdParam, querystring: ListSubjectsQuery } }, listSubjectsCtrl);
  app.get('/subjects/:id', { schema: { params: IdParam } }, getSubjectCtrl);
  app.post('/clients/:id/subjects', { schema: { params: IdParam, body: CreateSubjectBody } }, createSubjectCtrl);
  app.patch('/subjects/:id', { schema: { params: IdParam, body: UpdateSubjectBody } }, updateSubjectCtrl);
}
