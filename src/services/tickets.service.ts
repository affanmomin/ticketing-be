import { PoolClient } from 'pg';
import { canEditStatus } from '../types/common';
import { forbidden, notFound } from '../utils/errors';
import { TicketFilterQueryT, CreateTicketBodyT, UpdateTicketBodyT } from '../schemas/tickets.schema';

export async function listTickets(tx: PoolClient, filter: TicketFilterQueryT) {
  const where: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (filter.clientId) {
    where.push(`"clientId" = $${i++}`);
    params.push(filter.clientId);
  }
  if (filter.projectId) {
    where.push(`"projectId" = $${i++}`);
    params.push(filter.projectId);
  }
  if (filter.streamId) {
    where.push(`"streamId" = $${i++}`);
    params.push(filter.streamId);
  }
  if (filter.assigneeId) {
    where.push(`"assigneeId" = $${i++}`);
    params.push(filter.assigneeId);
  }
  if (filter.status?.length) {
    where.push(`status = any($${i++})`);
    params.push(filter.status);
  }
  if (filter.search) {
    where.push(`(title ilike $${i++} or "descriptionMd" ilike $${i++})`);
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const sql = `
    select * from "Ticket"
    ${where.length ? 'where ' + where.join(' and ') : ''}
    order by "updatedAt" desc
    limit ${filter.limit} offset ${filter.offset};
  `;
  const { rows } = await tx.query(sql, params);
  return rows;
}

export async function getTicket(tx: PoolClient, id: string) {
  const { rows } = await tx.query(`select * from "Ticket" where id = $1`, [id]);
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
    insert into "Ticket" (
      id, "tenantId","clientId","projectId","streamId","reporterId","assigneeId",
      title,"descriptionMd", status, priority, type, points,"dueDate"
    ) values (
      gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    ) returning *;
  `,
    params,
  );
  const ticket = rows[0];

  if (body.tagIds?.length) {
    await tx.query(
      `insert into "TicketTagMap" ("ticketId","tagId","tenantId")
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
    update "Ticket" set
      title = coalesce($2, title),
      "descriptionMd" = coalesce($3, "descriptionMd"),
      status = coalesce($4, status),
      priority = coalesce($5, priority),
      type = coalesce($6, type),
      "assigneeId" = $7,
      "streamId" = $8,
      "dueDate" = $9,
      points = $10,
      "updatedAt" = now()
    where id = $1
    returning *;
  `,
    params,
  );
  if (!rows[0]) throw notFound('Ticket not found');

  if (body.tagIds) {
    await tx.query(`delete from "TicketTagMap" where "ticketId" = $1`, [body.id]);
    if (body.tagIds.length) {
      await tx.query(
        `insert into "TicketTagMap" ("ticketId","tagId","tenantId")
                      select $1, unnest($2::uuid[]), "tenantId" from "Ticket" where id=$1`,
        [body.id, body.tagIds],
      );
    }
  }
  return rows[0];
}
