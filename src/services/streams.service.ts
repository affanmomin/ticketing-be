import { PoolClient } from 'pg';
import { CreateStreamBodyT, UpdateStreamBodyT } from '../schemas/streams.schema';

export async function listStreams(tx: PoolClient, projectId: string) {
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", project_id as "projectId", name, created_at as "createdAt", updated_at as "updatedAt"
     from project_stream where project_id=$1 order by created_at desc`,
    [projectId],
  );
  return rows;
}

export async function createStream(tx: PoolClient, body: CreateStreamBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `insert into project_stream(id,tenant_id,project_id,name)
     values (gen_random_uuid(),$1,$2,$3)
     returning id, tenant_id as "tenantId", project_id as "projectId", name, created_at as "createdAt", updated_at as "updatedAt"`,
    [tenantId, body.projectId, body.name],
  );
  return rows[0];
}

export async function updateStream(tx: PoolClient, id: string, body: UpdateStreamBodyT) {
  const { rows } = await tx.query(
    `update project_stream set name=coalesce($2,name), updated_at=now() where id=$1
     returning id, tenant_id as "tenantId", project_id as "projectId", name, created_at as "createdAt", updated_at as "updatedAt"`,
    [id, body.name ?? null],
  );
  return rows[0] ?? null;
}
