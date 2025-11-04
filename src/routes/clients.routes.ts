import { FastifyInstance } from 'fastify';
import {
  listClientsCtrl,
  getClientCtrl,
  createClientCtrl,
  updateClientCtrl,
} from '../controllers/clients.controller';
import { ListClientsQuery, CreateClientBody, UpdateClientBody } from '../schemas/clients.schema';
import { IdParam } from '../schemas/common.schema';

export default async function clientsRoutes(app: FastifyInstance) {
  app.get('/clients', { schema: { querystring: ListClientsQuery } }, listClientsCtrl);
  app.get('/clients/:id', { schema: { params: IdParam } }, getClientCtrl);
  app.post('/clients', { schema: { body: CreateClientBody } }, createClientCtrl);
  app.patch('/clients/:id', { schema: { params: IdParam, body: UpdateClientBody } }, updateClientCtrl);
}
