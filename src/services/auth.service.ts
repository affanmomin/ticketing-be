import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { badRequest, unauthorized } from '../utils/errors';

export async function verifyLogin(tx: PoolClient, email: string, password: string, tenantId?: string) {
  const { rows: users } = await tx.query(
    `select id, email, "passwordHash" from "User" where email = $1 and "active" = true`,
    [email],
  );
  const user = users[0];
  if (!user) throw unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

  if (tenantId) {
    const { rows } = await tx.query(
      `select "tenantId", role, "clientId" from "tenant_membership" where "userId"=$1 and "tenantId"=$2`,
      [user.id, tenantId],
    );
    if (!rows[0]) throw unauthorized('No membership for provided tenant');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenantId, role: tm.role as any, clientId: tm.clientId ?? null };
  } else {
    const { rows } = await tx.query(
      `select "tenantId", role, "clientId" from "tenant_membership" where "userId"=$1`,
      [user.id],
    );
    if (rows.length === 0) throw unauthorized('User has no tenant membership');
    if (rows.length > 1) throw badRequest('Multiple memberships found; pass tenantId');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenantId, role: tm.role as any, clientId: tm.clientId ?? null };
  }
}
