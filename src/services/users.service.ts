import { PoolClient } from 'pg';

export async function listAssignableUsers(tx: PoolClient, clientId: string) {
  const { rows } = await tx.query(
    `
    select u.id, u.name, u.email
    from "User" u
    join "UserClientMap" m on m."userId" = u.id
    where m."clientId" = $1
    order by u.name asc
  `,
    [clientId],
  );
  return rows;
}
