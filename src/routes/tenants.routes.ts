import { FastifyInstance } from 'fastify';

export default async function tenantsRoutes(app: FastifyInstance) {
  app.get('/tenants/me', async (req) => ({ id: req.auth!.tenantId })); // minimal
}
