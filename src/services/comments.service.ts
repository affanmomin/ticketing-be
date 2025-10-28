import { PoolClient } from 'pg';
import { AddCommentBodyT } from '../schemas/comments.schema';

export async function listComments(tx: PoolClient, ticketId: string) {
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", ticket_id as "ticketId", author_id as "authorId", body_md as "bodyMd", created_at as "createdAt"
     from comment where ticket_id=$1 order by created_at asc`,
    [ticketId],
  );
  return rows;
}

export async function addComment(tx: PoolClient, body: AddCommentBodyT, userId: string, tenantId: string) {
  const { rows } = await tx.query(
    `
    insert into comment(id,tenant_id,ticket_id,author_id,body_md)
    values (gen_random_uuid(),$1,$2,$3,$4)
    returning id, tenant_id as "tenantId", ticket_id as "ticketId", author_id as "authorId", body_md as "bodyMd", created_at as "createdAt"
  `,
    [tenantId, body.ticketId, userId, body.bodyMd],
  );
  return rows[0];
}
