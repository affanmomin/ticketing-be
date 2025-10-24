import { FastifyInstance } from 'fastify';
import { usersAssignableCtrl } from '../controllers/users.controller';

export default async function usersRoutes(app: FastifyInstance) {
  app.get('/users/assignable', usersAssignableCtrl);
}
