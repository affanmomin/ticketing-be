import { FastifyInstance } from 'fastify';
import { loginCtrl, meCtrl } from '../controllers/auth.controller';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', loginCtrl); // public
  app.get('/auth/me', meCtrl); // protected
}
