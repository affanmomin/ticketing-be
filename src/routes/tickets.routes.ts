import { FastifyInstance } from 'fastify';
import { getTicketsCtrl, getTicketCtrl, createTicketCtrl, updateTicketCtrl } from '../controllers/tickets.controller';

export default async function ticketsRoutes(app: FastifyInstance) {
  app.get('/tickets', getTicketsCtrl);
  app.get('/tickets/:id', getTicketCtrl);
  app.post('/tickets', createTicketCtrl);
  app.post('/tickets-update/:id', updateTicketCtrl);
}
