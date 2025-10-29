import { FastifyInstance } from 'fastify';
import {
  usersAssignableCtrl,
  createUserCtrl,
  listUsersCtrl,
  getUserCtrl,
  updateUserCtrl,
  deleteUserCtrl,
} from '../controllers/users.controller';

export default async function usersRoutes(app: FastifyInstance) {
  // List assignable users for a client (existing endpoint)
  app.get('/users/assignable', usersAssignableCtrl);

  // CRUD operations for user management
  app.post('/users', createUserCtrl); // Create user (admin only)
  app.get('/users', listUsersCtrl); // List users with filters
  app.get('/users/:id', getUserCtrl); // Get single user
  app.put('/users/:id', updateUserCtrl); // Update user
  app.delete('/users/:id', deleteUserCtrl); // Delete user (admin only)
}
