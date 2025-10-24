import { FastifyInstance } from 'fastify';
import { listClientsCtrl, getClientCtrl, createClientCtrl, updateClientCtrl, mapEmployeeCtrl } from '../controllers/clients.controller';

export default async function clientsRoutes(app: FastifyInstance) {
  app.get('/clients', listClientsCtrl);
  app.get('/clients/:id', getClientCtrl);
  app.post('/clients', createClientCtrl);
  app.patch('/clients/:id', updateClientCtrl);
  app.post('/clients/:id/map-employee', mapEmployeeCtrl);
}
