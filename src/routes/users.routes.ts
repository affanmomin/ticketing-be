import { FastifyInstance } from 'fastify';
import {
  listUsersCtrl,
  getUserCtrl,
  createEmployeeCtrl,
  createClientUserCtrl,
  updateUserCtrl,
  changePasswordCtrl,
} from '../controllers/users.controller';
import { ListUsersQuery } from '../schemas/users.schema';
import { IdParam } from '../schemas/common.schema';

export default async function usersRoutes(app: FastifyInstance) {
  // List users (ADMIN/EMPLOYEE)
  app.get(
    '/users',
    { schema: { querystring: ListUsersQuery } },
    listUsersCtrl
  );

  // Get single user
  app.get('/users/:id', { schema: { params: IdParam } }, getUserCtrl);

  // Create employee (ADMIN only)
  app.post('/employees', createEmployeeCtrl);

  // Create client user (ADMIN only)
  app.post('/client-users', createClientUserCtrl);

  // Update user
  app.patch('/users/:id', { schema: { params: IdParam } }, updateUserCtrl);

  // Change password (self)
  app.post('/users/:id/password', { schema: { params: IdParam } }, changePasswordCtrl);
}
