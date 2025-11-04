import { FastifyInstance } from 'fastify';
import { signupCtrl, loginCtrl, meCtrl, logoutCtrl } from '../controllers/auth.controller';
import { AdminSignupBody, LoginBody } from '../schemas/auth.schema';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', { schema: { body: AdminSignupBody } }, signupCtrl); // public
  app.post('/auth/login', { schema: { body: LoginBody } }, loginCtrl); // public
  app.get('/auth/me', meCtrl); // protected
  app.post('/auth/logout', logoutCtrl); // protected
}
