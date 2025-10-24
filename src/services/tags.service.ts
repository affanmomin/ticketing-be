import { PoolClient } from 'pg';
import { CreateTagBodyT } from '../schemas/tags.schema';

export async function listTags(tx: PoolClient, clientId?: string) {
  const where = clientId ? `where "clientId"=$1 or "clientId" is null` : '';
  const params = clientId ? [clientId] : [] as any[];
  const { rows } = await tx.query(`select * from "TicketTag" ${where} order by name asc`, params);
  return rows;
}

export async function createTag(tx: PoolClient, body: CreateTagBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `
    insert into "TicketTag"(id,"tenantId","clientId",name,color)
    values (gen_random_uuid(),$1,$2,$3,$4) returning *
  `,
    [tenantId, body.clientId ?? null, body.name, body.color],
  );
  return rows[0];
}

export async function deleteTag(tx: PoolClient, id: string) {
  await tx.query(`delete from "TicketTagMap" where "tagId"=$1`, [id]);
  await tx.query(`delete from "TicketTag" where id=$1`, [id]);
  return { ok: true };
}
