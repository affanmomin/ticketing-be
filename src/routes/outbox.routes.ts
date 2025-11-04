import { FastifyInstance } from 'fastify';
import { listPendingOutboxCtrl, processOutboxCtrl } from '../controllers/outbox.controller';
import { ListOutboxQuery, ProcessOutboxBody } from '../schemas/outbox.schema';

export default async function outboxRoutes(app: FastifyInstance) {
  app.get('/_internal/outbox/pending', { schema: { querystring: ListOutboxQuery } }, listPendingOutboxCtrl);
  app.post('/_internal/outbox/process', { schema: { body: ProcessOutboxBody } }, processOutboxCtrl);
}
