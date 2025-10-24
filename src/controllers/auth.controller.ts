import { FastifyRequest, FastifyReply } from 'fastify';
import { LoginBody } from '../schemas/auth.schema';
import { pool } from '../db/pool';
import { verifyLogin } from '../services/auth.service';

export async function loginCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = LoginBody.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ctx = await verifyLogin(client, body.email, body.password, body.tenantId);
    await client.query('COMMIT');
    const token = await (req.server as any).jwt.sign({
      sub: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      clientId: ctx.clientId ?? null,
    });
    return reply.send({
      accessToken: token,
      user: { id: ctx.userId, tenantId: ctx.tenantId, role: ctx.role, clientId: ctx.clientId ?? null },
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function meCtrl(req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ user: req.auth });
}
