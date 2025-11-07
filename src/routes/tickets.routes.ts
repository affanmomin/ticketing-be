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
  app.post('/tickets', { schema: { body: CreateTicketBody } }, createTicketCtrl);
  app.post('/tickets/:id', { schema: { params: IdParam, body: UpdateTicketBody } }, updateTicketCtrl);
  app.delete('/tickets/:id', { schema: { params: IdParam } }, deleteTicketCtrl);
}
