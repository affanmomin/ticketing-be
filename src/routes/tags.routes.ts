import { FastifyInstance } from 'fastify';
import { listTagsCtrl, createTagCtrl, deleteTagCtrl } from '../controllers/tags.controller';

export default async function tagsRoutes(app: FastifyInstance) {
  app.get('/tags', listTagsCtrl);
  app.post('/tags', createTagCtrl);
  app.delete('/tags/:id', deleteTagCtrl);
}
