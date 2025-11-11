import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { unauthorized } from '../utils/errors';

export default fp(async (app) => {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret',
    sign: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  });

  app.addHook('onRequest', async (req, _res) => {
    // Allow unauthenticated routes
    const path = (req.url || '').split('?')[0];
    const unauthenticatedPaths = [
      '/health',
      '/auth/login',
      '/auth/signup',
      '/auth/client-signup',
      '/auth/invite',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/',
    ];
    if (unauthenticatedPaths.some(p => path === p) || path.startsWith('/docs')) return;

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw unauthorized('Missing or invalid Authorization header');
    const token = auth.split(' ')[1]!;
    let decoded: any;
    try {
      decoded = app.jwt.decode(token);
    } catch {
      throw unauthorized('Invalid token');
    }
    if (!decoded?.sub || !decoded?.organizationId || !decoded?.role) throw unauthorized('Invalid token');

    req.user = {
      userId: decoded.sub,
      organizationId: decoded.organizationId,
      role: decoded.role,
      clientId: decoded.clientId ?? null,
    };
  });
});
