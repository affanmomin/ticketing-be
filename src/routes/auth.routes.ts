import { FastifyInstance } from 'fastify';
import { signupCtrl, loginCtrl, meCtrl, logoutCtrl, forgotPasswordCtrl, resetPasswordCtrl } from '../controllers/auth.controller';
import { AdminSignupBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from '../schemas/auth.schema';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', { schema: { body: AdminSignupBody } }, signupCtrl); // public
  app.post('/auth/login', { schema: { body: LoginBody } }, loginCtrl); // public
  app.post('/auth/forgot-password', { schema: { body: ForgotPasswordBody } }, forgotPasswordCtrl); // public
  app.post('/auth/reset-password', { schema: { body: ResetPasswordBody } }, resetPasswordCtrl); // public
  app.get('/auth/me', meCtrl); // protected
  app.post('/auth/logout', logoutCtrl); // protected
}
