import { PoolClient } from 'pg';
import { CreateStreamBodyT, UpdateStreamBodyT } from '../schemas/streams.schema';

export async function listStreams(tx: PoolClient, projectId: string) {
  const { rows } = await tx.query(`select * from "ProjectStream" where "projectId"=$1 order by "createdAt" desc`, [projectId]);
  return rows;
}

export async function createStream(tx: PoolClient, body: CreateStreamBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `insert into "ProjectStream"(id,"tenantId","projectId",name) values (gen_random_uuid(),$1,$2,$3) returning *`,
    [tenantId, body.projectId, body.name],
  );
  return rows[0];
}

export async function updateStream(tx: PoolClient, id: string, body: UpdateStreamBodyT) {
  const { rows } = await tx.query(
    `update "ProjectStream" set name=coalesce($2,name),"updatedAt"=now() where id=$1 returning *`,
    [id, body.name ?? null],
  );
  return rows[0] ?? null;
}
