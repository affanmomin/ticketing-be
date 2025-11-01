import { FastifyRequest, FastifyReply } from 'fastify';
import { LoginBody } from '../schemas/auth.schema';
import { pool } from '../db/pool';
import { verifyLogin, getUserDashboardStats } from '../services/auth.service';
import { withRlsTx } from '../db/rls';

export async function loginCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = LoginBody.parse(req.body);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ctx = await verifyLogin(client, body.email, body.password, '416f7ce3-3807-4210-81e4-8905c3ca5133');
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
  return withRlsTx(req, async (tx) => {
    // Fetch user's name from database
    const { rows: userRows } = await tx.query(
      `SELECT name, email FROM "user" WHERE id = $1`,
      [req.auth!.userId]
    );
    
    const dashboardStats = await getUserDashboardStats(
      tx,
      req.auth!.tenantId,
      req.auth!.role,
      req.auth!.clientId ?? null
    );
    
    return reply.send({
      user: {
        ...req.auth,
        name: userRows[0]?.name,
        email: userRows[0]?.email,
      },
      dashboard: dashboardStats,
    });
  });
}

export async function logoutCtrl(_req: FastifyRequest, reply: FastifyReply) {
  // With stateless JWTs, server-side signout is a no-op unless we maintain a revocation list.
  // This endpoint exists so clients can call it and then delete their token locally.
  return reply.send({ ok: true });
}
