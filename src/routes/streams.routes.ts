import { FastifyInstance } from 'fastify';
import { listStreamsCtrl, createStreamCtrl, updateStreamCtrl } from '../controllers/streams.controller';

export default async function streamsRoutes(app: FastifyInstance) {
  app.get('/streams', listStreamsCtrl);
  app.post('/streams', createStreamCtrl);
  app.patch('/streams/:id', updateStreamCtrl);
}
