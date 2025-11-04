import { FastifyInstance } from 'fastify';

export default async function tenantsRoutes(app: FastifyInstance) {
  app.get('/tenants/me', async (req) => {
    if (!req.user) {
      return { id: null };
    }
    return { id: req.user.organizationId };
  });
}
