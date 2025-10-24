/// <reference path="./types/fastify.d.ts" />
import Fastify from 'fastify';
import { ZodTypeProvider, validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import security from './plugins/security';
import auth from './plugins/auth';
import multipart from './plugins/multipart';
import swagger from './plugins/swagger';
import registerRoutes from './routes';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.get('/', async (_req, reply) => reply.status(200).send('API is live'));
server.get('/health', async () => ({ ok: true }));

server.register(security);
server.register(multipart);
server.register(auth);
server.register(swagger);
server.register(registerRoutes);

server.setErrorHandler((err, _req, reply) => {
  const status = (err as any).statusCode ?? 500;
  const code = (err as any).code ?? 'INTERNAL';
  reply.status(status).send({ code, message: err.message ?? 'Server error' });
});

export default server;
