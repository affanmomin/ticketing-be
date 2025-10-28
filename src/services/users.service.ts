import { PoolClient } from 'pg';

export async function listAssignableUsers(tx: PoolClient, clientId: string) {
  const { rows } = await tx.query(
    `
    select u.id, u.name, u.email
    from "user" u
    join user_client_map m on m.user_id = u.id
    where m.client_id = $1
    order by u.name asc
  `,
    [clientId],
  );
  return rows;
}
