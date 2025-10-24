import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { unauthorized } from '../utils/errors';

export default fp(async (app) => {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret',
    sign: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  });

  app.addHook('onRequest', async (req, _res) => {
    // Allow health + /auth/login unauthenticated
    const path = (req.url || '').split('?')[0];
    if (path === '/health' || path === '/auth/login' || path === '/' || path.startsWith('/docs')) return;

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw unauthorized('Missing or invalid Authorization header');
    const token = auth.split(' ')[1]!;
    let decoded: any;
    try {
      decoded = app.jwt.decode(token);
    } catch {
      throw unauthorized('Invalid token');
    }
    if (!decoded?.sub || !decoded?.tenantId || !decoded?.role) throw unauthorized('Invalid token');

    req.auth = {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
      clientId: decoded.clientId ?? null,
    };
  });
});
