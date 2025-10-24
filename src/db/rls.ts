import { FastifyRequest } from 'fastify';
import { pool } from './pool';

export async function withRlsTx<T>(req: FastifyRequest, fn: (tx: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const { tenantId, userId, role, clientId } = req.auth!;
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query(`select set_config('app.tenant_id',$1,true)`, [tenantId]);
    await tx.query(`select set_config('app.user_id',$1,true)`, [userId]);
    await tx.query(`select set_config('app.role',$1,true)`, [role]);
    await tx.query(`select set_config('app.client_id',$1,true)`, [clientId ?? '']);
    (req as any).db = { tx };
    const result = await fn(tx);
    await tx.query('COMMIT');
    return result;
  } catch (e) {
    try {
      await tx.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    tx.release();
    (req as any).db = undefined;
  }
}
