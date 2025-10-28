import { PoolClient } from 'pg';
import { CreateProjectBodyT, UpdateProjectBodyT } from '../schemas/projects.schema';

export async function listProjects(tx: PoolClient, clientId?: string) {
  const where = clientId ? `where client_id=$1` : '';
  const params = clientId ? [clientId] : [] as any[];
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", client_id as "clientId", name, code, active, created_at as "createdAt", updated_at as "updatedAt"
     from project ${where} order by created_at desc`,
    params,
  );
  return rows;
}

export async function createProject(tx: PoolClient, body: CreateProjectBodyT, tenantId: string) {
  const { rows } = await tx.query(
    `insert into project(id,tenant_id,client_id,name,code,active)
    values (gen_random_uuid(),$1,$2,$3,$4,$5)
    returning id, tenant_id as "tenantId", client_id as "clientId", name, code, active, created_at as "createdAt", updated_at as "updatedAt"`,
    [tenantId, body.clientId, body.name, body.code, body.active ?? true],
  );
  return rows[0];
}

export async function getProject(tx: PoolClient, id: string) {
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", client_id as "clientId", name, code, active, created_at as "createdAt", updated_at as "updatedAt"
     from project where id=$1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateProject(tx: PoolClient, id: string, body: UpdateProjectBodyT) {
  const { rows } = await tx.query(
    `
    update project set
      name = coalesce($2, name),
      code = coalesce($3, code),
      active = coalesce($4, active),
      updated_at = now()
    where id=$1
    returning id, tenant_id as "tenantId", client_id as "clientId", name, code, active, created_at as "createdAt", updated_at as "updatedAt"
  `,
    [id, body.name ?? null, body.code ?? null, body.active ?? null],
  );
  return rows[0] ?? null;
}
