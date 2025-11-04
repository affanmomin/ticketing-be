import { FastifyInstance } from 'fastify';
import {
  listCommentsCtrl,
  getCommentCtrl,
  createCommentCtrl,
} from '../controllers/comments.controller';
import { CreateCommentBody } from '../schemas/comments.schema';
import { IdParam } from '../schemas/common.schema';

export default async function commentsRoutes(app: FastifyInstance) {
  app.get('/tickets/:id/comments', { schema: { params: IdParam } }, listCommentsCtrl);
  app.get('/comments/:id', { schema: { params: IdParam } }, getCommentCtrl);
  app.post('/tickets/:id/comments', { schema: { params: IdParam, body: CreateCommentBody } }, createCommentCtrl);
}
