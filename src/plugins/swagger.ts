import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import path from 'node:path';

export default fp(async (app) => {
  await app.register(swagger, {
    mode: 'static',
    specification: {
      path: path.join(process.cwd(), 'openapi.yaml'),
      baseDir: process.cwd(),
    },
    exposeRoute: true,
    openapi: {
      info: { title: 'Code Companion Ticketing API', version: '1.0.0' },
    },
  } as any);

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    staticCSP: true,
  } as any);
});
