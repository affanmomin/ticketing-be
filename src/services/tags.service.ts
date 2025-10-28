import { PoolClient } from 'pg';
import { CreateTagBodyT } from '../schemas/tags.schema';

export async function listTags(tx: PoolClient, clientId?: string) {
  const where = clientId ? `where client_id=$1 or client_id is null` : '';
  const params = clientId ? [clientId] : [] as any[];
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", client_id as "clientId", name, color from ticket_tag ${where} order by name asc`,
    params,
  );
  return rows;
}

export async function createTag(tx: PoolClient, body: CreateTagBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `
    insert into ticket_tag(id,tenant_id,client_id,name,color)
    values (gen_random_uuid(),$1,$2,$3,$4)
    returning id, tenant_id as "tenantId", client_id as "clientId", name, color
  `,
    [tenantId, body.clientId ?? null, body.name, body.color],
  );
  return rows[0];
}

export async function deleteTag(tx: PoolClient, id: string) {
  await tx.query(`delete from ticket_tag_map where tag_id=$1`, [id]);
  await tx.query(`delete from ticket_tag where id=$1`, [id]);
  return { ok: true };
}
