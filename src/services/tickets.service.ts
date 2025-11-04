import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';
import { Role } from '../types/common';

export interface TicketResult {
  id: string;
  projectId: string;
  raisedByUserId: string;
  assignedToUserId: string | null;
  streamId: string;
  subjectId: string;
  priorityId: string;
  statusId: string;
  title: string;
  descriptionMd: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

/**
 * List tickets scoped by user role and organization
 */
export async function listTickets(
  tx: PoolClient,
  organizationId: string,
  userRole: Role,
  userId: string,
  clientId: string | null,
  filters?: { projectId?: string; statusId?: string; priorityId?: string; assigneeId?: string },
  limit: number = 50,
  offset: number = 0
): Promise<{ data: TicketResult[]; total: number }> {
  const conditions: string[] = ['t.is_deleted = false'];
  const params: any[] = [];
  let paramIndex = 1;

  if (userRole === 'ADMIN' || userRole === 'EMPLOYEE') {
    // Internal users: filter by organization (via project)
    conditions.push(`c.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  } else if (userRole === 'CLIENT') {
    // CLIENT: filter by their client
    conditions.push(`p.client_id = $${paramIndex}`);
    params.push(clientId);
    paramIndex++;
  }

  if (filters?.projectId) {
    conditions.push(`t.project_id = $${paramIndex}`);
    params.push(filters.projectId);
    paramIndex++;
  }

  if (filters?.statusId) {
    conditions.push(`t.status_id = $${paramIndex}`);
    params.push(filters.statusId);
    paramIndex++;
  }

  if (filters?.priorityId) {
    conditions.push(`t.priority_id = $${paramIndex}`);
    params.push(filters.priorityId);
    paramIndex++;
  }

  if (filters?.assigneeId) {
    conditions.push(`t.assigned_to_user_id = $${paramIndex}`);
    params.push(filters.assigneeId);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const { rows: countRows } = await tx.query(
    `SELECT COUNT(*)::int as total FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     WHERE ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // Get paginated results
  params.push(limit, offset);
  const { rows } = await tx.query(
    `SELECT t.id, t.project_id, t.raised_by_user_id, t.assigned_to_user_id,
            t.stream_id, t.subject_id, t.priority_id, t.status_id, t.title,
            t.description_md, t.is_deleted, t.created_at, t.updated_at, t.closed_at
     FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      raisedByUserId: r.raised_by_user_id,
      assignedToUserId: r.assigned_to_user_id,
      streamId: r.stream_id,
      subjectId: r.subject_id,
      priorityId: r.priority_id,
      statusId: r.status_id,
      title: r.title,
      descriptionMd: r.description_md,
      isDeleted: r.is_deleted,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      closedAt: r.closed_at,
    })),
    total,
  };
}

/**
 * Create a ticket with raise permission check
 */
export async function createTicket(
  tx: PoolClient,
  projectId: string,
  raisedByUserId: string,
  streamId: string,
  subjectId: string,
  priorityId: string,
  statusId: string,
  title: string,
  descriptionMd?: string | null,
  assignedToUserId?: string | null
): Promise<TicketResult> {
  // Verify project exists
  const { rows: projectRows } = await tx.query(
    'SELECT id, client_id FROM project WHERE id = $1',
    [projectId]
  );
  if (projectRows.length === 0) throw notFound('Project not found');

  // Verify user can raise tickets in this project
  const { rows: canRaise } = await tx.query(
    `SELECT 1 FROM project_member
     WHERE project_id = $1 AND user_id = $2 AND can_raise = true`,
    [projectId, raisedByUserId]
  );
  if (canRaise.length === 0) throw forbidden('User does not have permission to raise tickets in this project');

  // If assigning, verify user can be assigned
  if (assignedToUserId) {
    const { rows: canBeAssigned } = await tx.query(
      `SELECT 1 FROM project_member
       WHERE project_id = $1 AND user_id = $2 AND can_be_assigned = true`,
      [projectId, assignedToUserId]
    );
    if (canBeAssigned.length === 0) throw forbidden('User cannot be assigned tickets in this project');
  }

  // Create ticket
  const { rows: ticketRows } = await tx.query(
    `INSERT INTO ticket (
      project_id, raised_by_user_id, assigned_to_user_id, stream_id, subject_id,
      priority_id, status_id, title, description_md
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, project_id, raised_by_user_id, assigned_to_user_id, stream_id,
              subject_id, priority_id, status_id, title, description_md,
              is_deleted, created_at, updated_at, closed_at`,
    [
      projectId, raisedByUserId, assignedToUserId || null, streamId, subjectId,
      priorityId, statusId, title, descriptionMd || null
    ]
  );

  const ticket = ticketRows[0];

  // Create TICKET_CREATED event
  await tx.query(
    `INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
     VALUES ($1, $2, 'TICKET_CREATED', $3::jsonb)`,
    [ticket.id, raisedByUserId, JSON.stringify({ title, description: descriptionMd ?? null })]
  );

  // Add to notification outbox
  await tx.query(
    `INSERT INTO notification_outbox (topic, ticket_id, recipient_user_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      'TICKET_CREATED',
      ticket.id,
      assignedToUserId || raisedByUserId,
      JSON.stringify({ subject: `New ticket: ${title}`, body: descriptionMd })
    ]
  );

  return {
    id: ticket.id,
    projectId: ticket.project_id,
    raisedByUserId: ticket.raised_by_user_id,
    assignedToUserId: ticket.assigned_to_user_id,
    streamId: ticket.stream_id,
    subjectId: ticket.subject_id,
    priorityId: ticket.priority_id,
    statusId: ticket.status_id,
    title: ticket.title,
    descriptionMd: ticket.description_md,
    isDeleted: ticket.is_deleted,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    closedAt: ticket.closed_at,
  };
}

/**
 * Update ticket (handles status, priority, assignee changes with event creation)
 */
export async function updateTicket(
  tx: PoolClient,
  ticketId: string,
  updates: {
    statusId?: string;
    priorityId?: string;
    assignedToUserId?: string | null;
    title?: string;
    descriptionMd?: string | null;
  },
  updatedByUserId: string
): Promise<TicketResult> {
  // Get current ticket
  const { rows: ticketRows } = await tx.query(
    'SELECT * FROM ticket WHERE id = $1',
    [ticketId]
  );
  if (ticketRows.length === 0) throw notFound('Ticket not found');
  const currentTicket = ticketRows[0];

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.statusId !== undefined && updates.statusId !== currentTicket.status_id) {
    // Get new status to check if closed
    const { rows: statusRows } = await tx.query(
      'SELECT is_closed FROM status WHERE id = $1',
      [updates.statusId]
    );
    const isClosed = statusRows[0]?.is_closed;

    updateFields.push(`status_id = $${paramIndex}`);
    params.push(updates.statusId);
    paramIndex++;

    if (isClosed) {
      updateFields.push(`closed_at = NOW()`);
    } else {
      updateFields.push(`closed_at = NULL`);
    }

    // Create event
    await tx.query(
      `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'STATUS_CHANGED', $3::jsonb, $4::jsonb)`,
      [
        ticketId,
        updatedByUserId,
        JSON.stringify({ statusId: currentTicket.status_id }),
        JSON.stringify({ statusId: updates.statusId }),
      ]
    );
  }

  if (updates.priorityId !== undefined && updates.priorityId !== currentTicket.priority_id) {
    updateFields.push(`priority_id = $${paramIndex}`);
    params.push(updates.priorityId);
    paramIndex++;

    await tx.query(
      `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'PRIORITY_CHANGED', $3::jsonb, $4::jsonb)`,
      [
        ticketId,
        updatedByUserId,
        JSON.stringify({ priorityId: currentTicket.priority_id }),
        JSON.stringify({ priorityId: updates.priorityId }),
      ]
    );
  }

  if (updates.assignedToUserId !== undefined && updates.assignedToUserId !== currentTicket.assigned_to_user_id) {
    // If assigning, verify user can be assigned
    if (updates.assignedToUserId) {
      const { rows: canBeAssigned } = await tx.query(
        `SELECT 1 FROM project_member
         WHERE project_id = $1 AND user_id = $2 AND can_be_assigned = true`,
        [currentTicket.project_id, updates.assignedToUserId]
      );
      if (canBeAssigned.length === 0) throw forbidden('User cannot be assigned tickets');
    }

    updateFields.push(`assigned_to_user_id = $${paramIndex}`);
    params.push(updates.assignedToUserId || null);
    paramIndex++;

    await tx.query(
      `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'ASSIGNEE_CHANGED', $3::jsonb, $4::jsonb)`,
      [
        ticketId,
        updatedByUserId,
        JSON.stringify({ assignedToUserId: currentTicket.assigned_to_user_id }),
        JSON.stringify({ assignedToUserId: updates.assignedToUserId ?? null }),
      ]
    );
  }

  if (updates.title !== undefined) {
    updateFields.push(`title = $${paramIndex}`);
    params.push(updates.title);
    paramIndex++;

    await tx.query(
      `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'TITLE_UPDATED', $3::jsonb, $4::jsonb)`,
      [
        ticketId,
        updatedByUserId,
        JSON.stringify({ title: currentTicket.title }),
        JSON.stringify({ title: updates.title }),
      ]
    );
  }

  if (updates.descriptionMd !== undefined) {
    updateFields.push(`description_md = $${paramIndex}`);
    params.push(updates.descriptionMd);
    paramIndex++;

    await tx.query(
      `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'DESCRIPTION_UPDATED', $3::jsonb, $4::jsonb)`,
      [
        ticketId,
        updatedByUserId,
        JSON.stringify({ description: currentTicket.description_md }),
        JSON.stringify({ description: updates.descriptionMd ?? null }),
      ]
    );
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(ticketId);
  const { rows } = await tx.query(
    `UPDATE ticket SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, raised_by_user_id, assigned_to_user_id, stream_id,
               subject_id, priority_id, status_id, title, description_md,
               is_deleted, created_at, updated_at, closed_at`,
    params
  );

  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    raisedByUserId: r.raised_by_user_id,
    assignedToUserId: r.assigned_to_user_id,
    streamId: r.stream_id,
    subjectId: r.subject_id,
    priorityId: r.priority_id,
    statusId: r.status_id,
    title: r.title,
    descriptionMd: r.description_md,
    isDeleted: r.is_deleted,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
  };
}

/**
 * Get single ticket
 */
export async function getTicket(tx: PoolClient, ticketId: string): Promise<TicketResult> {
  const { rows } = await tx.query(
    `SELECT id, project_id, raised_by_user_id, assigned_to_user_id, stream_id,
            subject_id, priority_id, status_id, title, description_md,
            is_deleted, created_at, updated_at, closed_at
     FROM ticket WHERE id = $1 AND is_deleted = false`,
    [ticketId]
  );

  if (rows.length === 0) throw notFound('Ticket not found');

  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    raisedByUserId: r.raised_by_user_id,
    assignedToUserId: r.assigned_to_user_id,
    streamId: r.stream_id,
    subjectId: r.subject_id,
    priorityId: r.priority_id,
    statusId: r.status_id,
    title: r.title,
    descriptionMd: r.description_md,
    isDeleted: r.is_deleted,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
  };
}

/**
 * Soft delete ticket
 */
export async function deleteTicket(
  tx: PoolClient,
  ticketId: string,
  deletedByUserId: string
): Promise<void> {
  const { rows } = await tx.query(
    'UPDATE ticket SET is_deleted = true WHERE id = $1',
    [ticketId]
  );
  if (rows.length === 0) throw notFound('Ticket not found');
}
