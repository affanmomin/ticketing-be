import { PoolClient } from 'pg';
import { canEditStatus } from '../types/common';
import { forbidden, notFound } from '../utils/errors';
import { TicketFilterQueryT, CreateTicketBodyT, UpdateTicketBodyT } from '../schemas/tickets.schema';

export async function listTickets(tx: PoolClient, filter: TicketFilterQueryT) {
  const where: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (filter.clientId) {
    where.push(`client_id = $${i++}`);
    params.push(filter.clientId);
  }
  if (filter.projectId) {
    where.push(`project_id = $${i++}`);
    params.push(filter.projectId);
  }
  if (filter.streamId) {
    where.push(`stream_id = $${i++}`);
    params.push(filter.streamId);
  }
  if (filter.assigneeId) {
    where.push(`assignee_id = $${i++}`);
    params.push(filter.assigneeId);
  }
  if (filter.status?.length) {
    where.push(`status = any($${i++})`);
    params.push(filter.status);
  }
  if (filter.search) {
    where.push(`(title ilike $${i++} or description_md ilike $${i++})`);
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const sql = `
    select id, tenant_id as "tenantId", client_id as "clientId", project_id as "projectId", stream_id as "streamId",
           reporter_id as "reporterId", assignee_id as "assigneeId", title, description_md as "descriptionMd", status,
           priority, type, points, due_date as "dueDate", archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
    from ticket
    ${where.length ? 'where ' + where.join(' and ') : ''}
    order by updated_at desc
    limit ${filter.limit} offset ${filter.offset};
  `;
  const { rows } = await tx.query(sql, params);
  return rows;
}

export async function getTicket(tx: PoolClient, id: string) {
  const { rows } = await tx.query(
    `select id, tenant_id as "tenantId", client_id as "clientId", project_id as "projectId", stream_id as "streamId",
            reporter_id as "reporterId", assignee_id as "assigneeId", title, description_md as "descriptionMd", status,
            priority, type, points, due_date as "dueDate", archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
     from ticket where id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Ticket not found');
  return rows[0];
}

export async function createTicket(tx: PoolClient, body: CreateTicketBodyT, ctx: { userId: string; tenantId: string }) {
  const params = [
    ctx.tenantId,
    body.clientId,
    body.projectId,
    body.streamId ?? null,
    ctx.userId,
    body.assigneeId ?? null,
    body.title,
    body.descriptionMd,
    'BACKLOG',
    body.priority,
    body.type,
    body.points ?? null,
    body.dueDate ?? null,
  ];
  const { rows } = await tx.query(
    `
    insert into ticket (
      id, tenant_id, client_id, project_id, stream_id, reporter_id, assignee_id,
      title, description_md, status, priority, type, points, due_date
    ) values (
      gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    ) returning id, tenant_id as "tenantId", client_id as "clientId", project_id as "projectId", stream_id as "streamId",
              reporter_id as "reporterId", assignee_id as "assigneeId", title, description_md as "descriptionMd", status,
              priority, type, points, due_date as "dueDate", archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt";
  `,
    params,
  );
  const ticket = rows[0];

  if (body.tagIds?.length) {
    await tx.query(
      `insert into ticket_tag_map (ticket_id, tag_id, tenant_id)
                    select $1, unnest($2::uuid[]), $3`,
      [ticket.id, body.tagIds, ctx.tenantId],
    );
  }
  return ticket;
}

export async function updateTicket(tx: PoolClient, body: UpdateTicketBodyT, role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT') {
  if (body.status && !canEditStatus(role)) throw forbidden('Clients cannot change status');

  const params = [
    body.id,
    body.title ?? null,
    body.descriptionMd ?? null,
    canEditStatus(role) ? body.status ?? null : null,
    body.priority ?? null,
    body.type ?? null,
    body.assigneeId ?? null,
    body.streamId ?? null,
    body.dueDate ?? null,
    body.points ?? null,
  ];
  const { rows } = await tx.query(
    `
    update ticket set
      title = coalesce($2, title),
      description_md = coalesce($3, description_md),
      status = coalesce($4, status),
      priority = coalesce($5, priority),
      type = coalesce($6, type),
      assignee_id = $7,
      stream_id = $8,
      due_date = $9,
      points = $10,
      updated_at = now()
    where id = $1
    returning id, tenant_id as "tenantId", client_id as "clientId", project_id as "projectId", stream_id as "streamId",
              reporter_id as "reporterId", assignee_id as "assigneeId", title, description_md as "descriptionMd", status,
              priority, type, points, due_date as "dueDate", archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt";
  `,
    params,
  );
  if (!rows[0]) throw notFound('Ticket not found');

  if (body.tagIds) {
    await tx.query(`delete from ticket_tag_map where ticket_id = $1`, [body.id]);
    if (body.tagIds.length) {
      await tx.query(
        `insert into ticket_tag_map (ticket_id, tag_id, tenant_id)
                      select $1, unnest($2::uuid[]), tenant_id from ticket where id=$1`,
        [body.id, body.tagIds],
      );
    }
  }
  return rows[0];
}
