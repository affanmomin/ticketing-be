import { FastifyInstance } from 'fastify';
import {
  listStreamsCtrl,
  getStreamCtrl,
  createStreamCtrl,
  updateStreamCtrl,
} from '../controllers/streams.controller';
import { ListStreamsQuery, CreateStreamBody, UpdateStreamBody } from '../schemas/streams.schema';
import { IdParam } from '../schemas/common.schema';

export default async function streamsRoutes(app: FastifyInstance) {
  app.get('/clients/:id/streams', { schema: { params: IdParam, querystring: ListStreamsQuery } }, listStreamsCtrl);
  app.get('/streams/:id', { schema: { params: IdParam } }, getStreamCtrl);
  app.post('/clients/:id/streams', { schema: { params: IdParam, body: CreateStreamBody } }, createStreamCtrl);
  app.post('/streams/:id', { schema: { params: IdParam, body: UpdateStreamBody } }, updateStreamCtrl);
}
