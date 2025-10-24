import { PoolClient } from 'pg';
import { AddCommentBodyT } from '../schemas/comments.schema';

export async function listComments(tx: PoolClient, ticketId: string) {
  const { rows } = await tx.query(`select * from "Comment" where "ticketId"=$1 order by "createdAt" asc`, [ticketId]);
  return rows;
}

export async function addComment(tx: PoolClient, body: AddCommentBodyT, userId: string, tenantId: string) {
  const { rows } = await tx.query(
    `
    insert into "Comment"(id,"tenantId","ticketId","authorId","bodyMd")
    values (gen_random_uuid(),$1,$2,$3,$4) returning *
  `,
    [tenantId, body.ticketId, userId, body.bodyMd],
  );
  return rows[0];
}
