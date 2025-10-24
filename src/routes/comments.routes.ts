import { FastifyInstance } from 'fastify';
import { listCommentsCtrl, addCommentCtrl } from '../controllers/comments.controller';

export default async function commentsRoutes(app: FastifyInstance) {
  app.get('/tickets/:id/comments', listCommentsCtrl);
  app.post('/comments', addCommentCtrl);
}
