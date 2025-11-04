import { FastifyInstance } from 'fastify';
import { listPrioritiesCtrl, listStatusesCtrl } from '../controllers/tags.controller';

export default async function tagsRoutes(app: FastifyInstance) {
  app.get('/taxonomy/priority', listPrioritiesCtrl);
  app.get('/taxonomy/status', listStatusesCtrl);
}
