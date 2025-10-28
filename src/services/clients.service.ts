import { PoolClient } from 'pg';
import { CreateClientBodyT, UpdateClientBodyT } from '../schemas/clients.schema';

export async function listClients(
  tx: PoolClient,
  { limit, offset }: { limit: number; offset: number },
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT',
  clientId?: string | null,
) {
  if (role === 'CLIENT') {
    const { rows } = await tx.query(
      `select id, tenant_id as "tenantId", name, domain, active, created_at as "createdAt", updated_at as "updatedAt"
       from client_company where id = $1 limit 1`,
      [clientId],
    );
    return rows;
  }
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", name, domain, active, created_at as "createdAt", updated_at as "updatedAt"
     from client_company order by created_at desc limit $1 offset $2`,
    [limit, offset],
  );
  return rows;
}

export async function getClient(tx: PoolClient, id: string) {
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", name, domain, active, created_at as "createdAt", updated_at as "updatedAt"
     from client_company where id=$1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createClient(tx: PoolClient, body: CreateClientBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `insert into client_company(id,tenant_id,name,domain,active)
     values (gen_random_uuid(),$1,$2,$3,$4)
     returning id, tenant_id as "tenantId", name, domain, active, created_at as "createdAt", updated_at as "updatedAt"`,
    [tenantId, body.name, body.domain ?? null, body.active ?? true],
  );
  return rows[0];
}

export async function updateClient(tx: PoolClient, id: string, body: UpdateClientBodyT) {
  const { rows } = await tx.query(
    `
    update client_company set
      name = coalesce($2, name),
      domain = coalesce($3, domain),
      active = coalesce($4, active),
      updated_at = now()
    where id=$1
    returning id, tenant_id as "tenantId", name, domain, active, created_at as "createdAt", updated_at as "updatedAt"
  `,
    [id, body.name ?? null, body.domain ?? null, body.active ?? null],
  );
  return rows[0] ?? null;
}

export async function mapEmployeeToClient(tx: PoolClient, userId: string, clientId: string, tenantId: string) {
  await tx.query(
    `insert into user_client_map(id,tenant_id,user_id,client_id)
     values (gen_random_uuid(),$1,$2,$3)
     on conflict (tenant_id, user_id, client_id) do nothing`,
    [tenantId, userId, clientId],
  );
  return { ok: true };
}
