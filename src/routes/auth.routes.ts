import { FastifyInstance } from 'fastify';
import { loginCtrl, meCtrl, logoutCtrl } from '../controllers/auth.controller';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', loginCtrl); // public
  app.get('/auth/me', meCtrl); // protected
  app.post('/auth/logout', logoutCtrl); // protected (client discards token)
}
