import 'fastify';
import { PoolClient } from 'pg';
import { AuthContext } from './common';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    db?: { tx: PoolClient };
  }
}
