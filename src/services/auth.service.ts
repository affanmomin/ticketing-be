import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { badRequest, unauthorized } from '../utils/errors';

export async function verifyLogin(tx: PoolClient, email: string, password: string, tenantId?: string) {
  const { rows: users } = await tx.query(
    `select id, email, password_hash as "passwordHash" from "user" where lower(email) = lower($1) and active = true`,
    [email],
  );
  const user = users[0];
  if (!user) throw unauthorized('Invalid credentials');

  // bcryptjs does not return a Promise for compare(); wrap it to use with await
  const ok = await bcrypt.compare(password, user.passwordHash.trim());
  if (!ok) throw unauthorized('Invalid credentials');

  if (tenantId) {
    const { rows } = await tx.query(
      `select tenant_id, role, client_id from tenant_membership where user_id=$1 and tenant_id=$2`,
      [user.id, tenantId],
    );
    if (!rows[0]) throw unauthorized('No membership for provided tenant');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenant_id, role: tm.role as any, clientId: tm.client_id ?? null };
  } else {
    const { rows } = await tx.query(
      `select tenant_id, role, client_id from tenant_membership where user_id=$1`,
      [user.id],
    );
    if (rows.length === 0) throw unauthorized('User has no tenant membership');
    if (rows.length > 1) throw badRequest('Multiple memberships found; pass tenantId');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenant_id, role: tm.role as any, clientId: tm.client_id ?? null };
  }
}
