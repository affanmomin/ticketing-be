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
  // Get project details
  const { rows: projectRows } = await tx.query(
    `select id, tenant_id as "tenantId", client_id as "clientId", name, code, active, created_at as "createdAt", updated_at as "updatedAt"
     from project where id=$1`,
    [id],
  );
  
  if (!projectRows[0]) return null;
  
  const project = projectRows[0];

  // Get all streams for this project
  const { rows: streams } = await tx.query(
    `select id, tenant_id as "tenantId", project_id as "projectId", name, created_at as "createdAt", updated_at as "updatedAt"
     from project_stream where project_id=$1 order by created_at desc`,
    [id],
  );

  // Get all tickets for this project with assignee and reporter details
  const { rows: tickets } = await tx.query(
    `select 
      t.id, 
      t.tenant_id as "tenantId", 
      t.client_id as "clientId", 
      t.project_id as "projectId", 
      t.stream_id as "streamId",
      t.reporter_id as "reporterId", 
      t.assignee_id as "assigneeId", 
      t.title, 
      t.description_md as "descriptionMd", 
      t.status,
      t.priority, 
      t.type, 
      t.points, 
      t.due_date as "dueDate", 
      t.archived_at as "archivedAt", 
      t.created_at as "createdAt", 
      t.updated_at as "updatedAt",
      json_build_object(
        'id', assignee.id,
        'name', assignee.name,
        'email', assignee.email,
        'userType', assignee.user_type
      ) as assignee,
      json_build_object(
        'id', reporter.id,
        'name', reporter.name,
        'email', reporter.email,
        'userType', reporter.user_type
      ) as reporter
     from ticket t
     left join "user" assignee on t.assignee_id = assignee.id
     left join "user" reporter on t.reporter_id = reporter.id
     where t.project_id=$1 
     order by t.updated_at desc`,
    [id],
  );

  return {
    ...project,
    streams,
    tickets,
  };
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
