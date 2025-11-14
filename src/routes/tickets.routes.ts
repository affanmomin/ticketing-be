import { FastifyInstance } from 'fastify';
import {
  listTicketsCtrl,
  getTicketCtrl,
  createTicketCtrl,
  updateTicketCtrl,
  deleteTicketCtrl,
} from '../controllers/tickets.controller';
import { ListTicketsQuery, CreateTicketBody, UpdateTicketBody } from '../schemas/tickets.schema';
import { IdParam } from '../schemas/common.schema';

export default async function ticketsRoutes(app: FastifyInstance) {
  app.get('/tickets', { schema: { querystring: ListTicketsQuery } }, listTicketsCtrl);
  app.get('/tickets/:id', { schema: { params: IdParam } }, getTicketCtrl);
  // POST /tickets supports both JSON and multipart/form-data
  // Schema validation is handled in the controller for multipart requests
  app.post('/tickets', createTicketCtrl);
  app.post('/tickets/:id', { schema: { params: IdParam, body: UpdateTicketBody } }, updateTicketCtrl);
  app.delete('/tickets/:id', { schema: { params: IdParam } }, deleteTicketCtrl);
}
