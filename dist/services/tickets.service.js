"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTickets = listTickets;
exports.createTicket = createTicket;
exports.updateTicket = updateTicket;
exports.getTicket = getTicket;
exports.deleteTicket = deleteTicket;
const errors_1 = require("../utils/errors");
const email_service_1 = require("./email.service");
const ticket_number_1 = require("../utils/ticket-number");
function getNextClientTicketNumber(tx, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`INSERT INTO client_ticket_counter (client_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (client_id)
     DO UPDATE SET last_number = client_ticket_counter.last_number + 1
     RETURNING last_number`, [context.clientId]);
        const sequence = rows[0].last_number;
        return (0, ticket_number_1.formatClientTicketNumber)(context.clientName, sequence);
    });
}
/**
 * List tickets scoped by user role and organization
 */
function listTickets(tx_1, organizationId_1, userRole_1, userId_1, clientId_1, filters_1) {
    return __awaiter(this, arguments, void 0, function* (tx, organizationId, userRole, userId, clientId, filters, limit = 50, offset = 0) {
        const conditions = ['t.is_deleted = false'];
        const params = [];
        let paramIndex = 1;
        if (userRole === 'ADMIN') {
            // ADMIN: filter by organization (see all org tickets)
            conditions.push(`c.organization_id = $${paramIndex}`);
            params.push(organizationId);
            paramIndex++;
        }
        else if (userRole === 'EMPLOYEE') {
            // EMPLOYEE: filter by tickets assigned to them OR raised by them
            conditions.push(`(t.assigned_to_user_id = $${paramIndex} OR t.raised_by_user_id = $${paramIndex})`);
            params.push(userId);
            paramIndex++;
        }
        else if (userRole === 'CLIENT') {
            // CLIENT: filter by their client's projects
            conditions.push(`p.client_id = $${paramIndex}`);
            params.push(clientId);
            paramIndex++;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.projectId) {
            conditions.push(`t.project_id = $${paramIndex}`);
            params.push(filters.projectId);
            paramIndex++;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.statusId) {
            conditions.push(`t.status_id = $${paramIndex}`);
            params.push(filters.statusId);
            paramIndex++;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.priorityId) {
            conditions.push(`t.priority_id = $${paramIndex}`);
            params.push(filters.priorityId);
            paramIndex++;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.assigneeId) {
            conditions.push(`t.assigned_to_user_id = $${paramIndex}`);
            params.push(filters.assigneeId);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        // Get total count
        const { rows: countRows } = yield tx.query(`SELECT COUNT(*)::int as total FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     WHERE ${whereClause}`, params);
        const total = countRows[0].total;
        // Get paginated results
        params.push(limit, offset);
        const { rows } = yield tx.query(`SELECT
            t.id,
            t.project_id,
            p.name AS project_name,
            p.client_id,
            c.name AS client_name,
            t.client_ticket_number,
            t.raised_by_user_id,
            raised_by.full_name AS raised_by_name,
            raised_by.email AS raised_by_email,
            t.assigned_to_user_id,
            assigned_to.full_name AS assigned_to_name,
            assigned_to.email AS assigned_to_email,
            t.stream_id,
            st.name AS stream_name,
            parent_st.id AS parent_stream_id,
            parent_st.name AS parent_stream_name,
            t.subject_id,
            sbj.name AS subject_name,
            t.priority_id,
            pr.name AS priority_name,
            t.status_id,
            s.name AS status_name,
            t.title,
            t.description_md,
            t.is_deleted,
            t.created_at,
            t.updated_at,
            t.closed_at
     FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     JOIN stream st ON st.id = t.stream_id
     LEFT JOIN stream parent_st ON parent_st.id = st.parent_stream_id
     JOIN subject sbj ON sbj.id = t.subject_id
     JOIN priority pr ON pr.id = t.priority_id
     JOIN status s ON s.id = t.status_id
     JOIN app_user raised_by ON raised_by.id = t.raised_by_user_id
     LEFT JOIN app_user assigned_to ON assigned_to.id = t.assigned_to_user_id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
        return {
            data: rows.map(r => ({
                id: r.id,
                projectId: r.project_id,
                projectName: r.project_name,
                clientId: r.client_id,
                clientName: r.client_name,
                clientTicketNumber: r.client_ticket_number,
                raisedByUserId: r.raised_by_user_id,
                raisedByName: r.raised_by_name,
                raisedByEmail: r.raised_by_email,
                assignedToUserId: r.assigned_to_user_id,
                assignedToName: r.assigned_to_name,
                assignedToEmail: r.assigned_to_email,
                streamId: r.stream_id,
                streamName: r.stream_name,
                parentStreamId: r.parent_stream_id,
                parentStreamName: r.parent_stream_name,
                subjectId: r.subject_id,
                subjectName: r.subject_name,
                priorityId: r.priority_id,
                priorityName: r.priority_name,
                statusId: r.status_id,
                statusName: r.status_name,
                title: r.title,
                descriptionMd: r.description_md,
                isDeleted: r.is_deleted,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                closedAt: r.closed_at,
            })),
            total,
        };
    });
}
/**
 * Create a ticket with raise permission check
 */
function createTicket(tx, projectId, raisedByUserId, streamId, subjectId, priorityId, statusId, title, descriptionMd, assignedToUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verify project exists
        const { rows: projectRows } = yield tx.query(`SELECT p.id, p.client_id, c.name AS client_name
     FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1`, [projectId]);
        if (projectRows.length === 0)
            throw (0, errors_1.notFound)('Project not found');
        const project = projectRows[0];
        // Verify user can raise tickets in this project
        const { rows: canRaise } = yield tx.query(`SELECT 1 FROM project_member
     WHERE project_id = $1 AND user_id = $2 AND can_raise = true`, [projectId, raisedByUserId]);
        if (canRaise.length === 0)
            throw (0, errors_1.forbidden)('User does not have permission to raise tickets in this project');
        // If assigning, verify user can be assigned
        if (assignedToUserId) {
            const { rows: canBeAssigned } = yield tx.query(`SELECT 1 FROM project_member
       WHERE project_id = $1 AND user_id = $2 AND can_be_assigned = true`, [projectId, assignedToUserId]);
            if (canBeAssigned.length === 0)
                throw (0, errors_1.forbidden)('User cannot be assigned tickets in this project');
        }
        const clientTicketNumber = yield getNextClientTicketNumber(tx, {
            clientId: project.client_id,
            clientName: project.client_name,
        });
        // Create ticket
        const { rows: ticketRows } = yield tx.query(`INSERT INTO ticket (
      project_id, raised_by_user_id, assigned_to_user_id, stream_id, subject_id,
      priority_id, status_id, title, description_md, client_ticket_number
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, project_id, raised_by_user_id, assigned_to_user_id, stream_id,
              subject_id, priority_id, status_id, title, description_md,
              is_deleted, created_at, updated_at, closed_at, client_ticket_number`, [
            projectId,
            raisedByUserId,
            assignedToUserId || null,
            streamId,
            subjectId,
            priorityId,
            statusId,
            title,
            descriptionMd || null,
            clientTicketNumber,
        ]);
        const ticket = ticketRows[0];
        // Create TICKET_CREATED event
        yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
     VALUES ($1, $2, 'TICKET_CREATED', $3::jsonb)`, [ticket.id, raisedByUserId, JSON.stringify({ title, description: descriptionMd !== null && descriptionMd !== void 0 ? descriptionMd : null })]);
        // Add to notification outbox
        yield tx.query(`INSERT INTO notification_outbox (topic, ticket_id, recipient_user_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`, [
            'TICKET_CREATED',
            ticket.id,
            assignedToUserId || raisedByUserId,
            JSON.stringify({ subject: `New ticket: ${title}`, body: descriptionMd })
        ]);
        // Fetch related names for the created ticket
        const { rows: detailsRows } = yield tx.query(`SELECT
            p.id AS project_id,
            p.name AS project_name,
            p.client_id,
            c.name AS client_name,
            raised_by.id AS raised_by_user_id,
            raised_by.full_name AS raised_by_name,
            raised_by.email AS raised_by_email,
            assigned_to.id AS assigned_to_user_id,
            assigned_to.full_name AS assigned_to_name,
            assigned_to.email AS assigned_to_email,
            st.id AS stream_id,
            st.name AS stream_name,
            parent_st.id AS parent_stream_id,
            parent_st.name AS parent_stream_name,
            sbj.id AS subject_id,
            sbj.name AS subject_name,
            pr.id AS priority_id,
            pr.name AS priority_name,
            s.id AS status_id,
            s.name AS status_name
     FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     JOIN stream st ON st.id = t.stream_id
     LEFT JOIN stream parent_st ON parent_st.id = st.parent_stream_id
     JOIN subject sbj ON sbj.id = t.subject_id
     JOIN priority pr ON pr.id = t.priority_id
     JOIN status s ON s.id = t.status_id
     JOIN app_user raised_by ON raised_by.id = t.raised_by_user_id
     LEFT JOIN app_user assigned_to ON assigned_to.id = t.assigned_to_user_id
     WHERE t.id = $1`, [ticket.id]);
        const details = detailsRows[0];
        // Send email notification if ticket is assigned to a user
        if (ticket.assigned_to_user_id && details.assigned_to_email && details.assigned_to_name) {
            // Send email asynchronously (don't await to avoid blocking ticket creation)
            // Note: ticketDescription and ticketId parameters are kept for API compatibility but not used in email
            email_service_1.emailService.sendTicketCreatedEmail(details.assigned_to_email, details.assigned_to_name, ticket.title, ticket.description_md, details.raised_by_name, details.project_name, ticket.id).catch((error) => {
                // Error is already logged in the email service, but we log here too for visibility
                console.error(`Failed to send ticket creation email for ticket ${ticket.id}:`, error);
            });
        }
        return {
            id: ticket.id,
            projectId: ticket.project_id,
            projectName: details.project_name,
            clientId: details.client_id,
            clientName: details.client_name,
            clientTicketNumber: ticket.client_ticket_number,
            raisedByUserId: ticket.raised_by_user_id,
            raisedByName: details.raised_by_name,
            raisedByEmail: details.raised_by_email,
            assignedToUserId: ticket.assigned_to_user_id,
            assignedToName: details.assigned_to_name,
            assignedToEmail: details.assigned_to_email,
            streamId: ticket.stream_id,
            streamName: details.stream_name,
            parentStreamId: details.parent_stream_id,
            parentStreamName: details.parent_stream_name,
            subjectId: ticket.subject_id,
            subjectName: details.subject_name,
            priorityId: ticket.priority_id,
            priorityName: details.priority_name,
            statusId: ticket.status_id,
            statusName: details.status_name,
            title: ticket.title,
            descriptionMd: ticket.description_md,
            isDeleted: ticket.is_deleted,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            closedAt: ticket.closed_at,
        };
    });
}
/**
 * Update ticket (handles status, priority, assignee changes with event creation)
 */
function updateTicket(tx, ticketId, updates, updatedByUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        // Get current ticket
        const { rows: ticketRows } = yield tx.query('SELECT * FROM ticket WHERE id = $1', [ticketId]);
        if (ticketRows.length === 0)
            throw (0, errors_1.notFound)('Ticket not found');
        const currentTicket = ticketRows[0];
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        if (updates.statusId !== undefined && updates.statusId !== currentTicket.status_id) {
            // Get new status to check if closed
            const { rows: statusRows } = yield tx.query('SELECT is_closed FROM status WHERE id = $1', [updates.statusId]);
            const isClosed = (_a = statusRows[0]) === null || _a === void 0 ? void 0 : _a.is_closed;
            updateFields.push(`status_id = $${paramIndex}`);
            params.push(updates.statusId);
            paramIndex++;
            if (isClosed) {
                updateFields.push(`closed_at = NOW()`);
            }
            else {
                updateFields.push(`closed_at = NULL`);
            }
            // Create event
            yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'STATUS_CHANGED', $3::jsonb, $4::jsonb)`, [
                ticketId,
                updatedByUserId,
                JSON.stringify({ statusId: currentTicket.status_id }),
                JSON.stringify({ statusId: updates.statusId }),
            ]);
        }
        if (updates.priorityId !== undefined && updates.priorityId !== currentTicket.priority_id) {
            updateFields.push(`priority_id = $${paramIndex}`);
            params.push(updates.priorityId);
            paramIndex++;
            yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'PRIORITY_CHANGED', $3::jsonb, $4::jsonb)`, [
                ticketId,
                updatedByUserId,
                JSON.stringify({ priorityId: currentTicket.priority_id }),
                JSON.stringify({ priorityId: updates.priorityId }),
            ]);
        }
        if (updates.assignedToUserId !== undefined && updates.assignedToUserId !== currentTicket.assigned_to_user_id) {
            // If assigning, verify user can be assigned
            if (updates.assignedToUserId) {
                const { rows: canBeAssigned } = yield tx.query(`SELECT 1 FROM project_member
         WHERE project_id = $1 AND user_id = $2 AND can_be_assigned = true`, [currentTicket.project_id, updates.assignedToUserId]);
                if (canBeAssigned.length === 0)
                    throw (0, errors_1.forbidden)('User cannot be assigned tickets');
            }
            updateFields.push(`assigned_to_user_id = $${paramIndex}`);
            params.push(updates.assignedToUserId || null);
            paramIndex++;
            yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'ASSIGNEE_CHANGED', $3::jsonb, $4::jsonb)`, [
                ticketId,
                updatedByUserId,
                JSON.stringify({ assignedToUserId: currentTicket.assigned_to_user_id }),
                JSON.stringify({ assignedToUserId: (_b = updates.assignedToUserId) !== null && _b !== void 0 ? _b : null }),
            ]);
        }
        if (updates.title !== undefined) {
            updateFields.push(`title = $${paramIndex}`);
            params.push(updates.title);
            paramIndex++;
            yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'TITLE_UPDATED', $3::jsonb, $4::jsonb)`, [
                ticketId,
                updatedByUserId,
                JSON.stringify({ title: currentTicket.title }),
                JSON.stringify({ title: updates.title }),
            ]);
        }
        if (updates.descriptionMd !== undefined) {
            updateFields.push(`description_md = $${paramIndex}`);
            params.push(updates.descriptionMd);
            paramIndex++;
            yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
       VALUES ($1, $2, 'DESCRIPTION_UPDATED', $3::jsonb, $4::jsonb)`, [
                ticketId,
                updatedByUserId,
                JSON.stringify({ description: currentTicket.description_md }),
                JSON.stringify({ description: (_c = updates.descriptionMd) !== null && _c !== void 0 ? _c : null }),
            ]);
        }
        if (updateFields.length === 0)
            throw (0, errors_1.badRequest)('No fields to update');
        params.push(ticketId);
        const { rows } = yield tx.query(`UPDATE ticket SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, raised_by_user_id, assigned_to_user_id, stream_id,
               subject_id, priority_id, status_id, title, description_md,
               is_deleted, created_at, updated_at, closed_at, client_ticket_number`, params);
        const r = rows[0];
        // Fetch related names for the updated ticket
        const { rows: detailsRows } = yield tx.query(`SELECT
            p.id AS project_id,
            p.name AS project_name,
            p.client_id,
            c.name AS client_name,
            raised_by.id AS raised_by_user_id,
            raised_by.full_name AS raised_by_name,
            raised_by.email AS raised_by_email,
            assigned_to.id AS assigned_to_user_id,
            assigned_to.full_name AS assigned_to_name,
            assigned_to.email AS assigned_to_email,
            st.id AS stream_id,
            st.name AS stream_name,
            parent_st.id AS parent_stream_id,
            parent_st.name AS parent_stream_name,
            sbj.id AS subject_id,
            sbj.name AS subject_name,
            pr.id AS priority_id,
            pr.name AS priority_name,
            s.id AS status_id,
            s.name AS status_name
     FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     JOIN stream st ON st.id = t.stream_id
     LEFT JOIN stream parent_st ON parent_st.id = st.parent_stream_id
     JOIN subject sbj ON sbj.id = t.subject_id
     JOIN priority pr ON pr.id = t.priority_id
     JOIN status s ON s.id = t.status_id
     JOIN app_user raised_by ON raised_by.id = t.raised_by_user_id
     LEFT JOIN app_user assigned_to ON assigned_to.id = t.assigned_to_user_id
     WHERE t.id = $1`, [ticketId]);
        const details = detailsRows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            projectName: details.project_name,
            clientId: details.client_id,
            clientName: details.client_name,
            raisedByUserId: r.raised_by_user_id,
            raisedByName: details.raised_by_name,
            raisedByEmail: details.raised_by_email,
            assignedToUserId: r.assigned_to_user_id,
            assignedToName: details.assigned_to_name,
            assignedToEmail: details.assigned_to_email,
            streamId: r.stream_id,
            streamName: details.stream_name,
            parentStreamId: details.parent_stream_id,
            parentStreamName: details.parent_stream_name,
            subjectId: r.subject_id,
            subjectName: details.subject_name,
            priorityId: r.priority_id,
            priorityName: details.priority_name,
            statusId: r.status_id,
            statusName: details.status_name,
            title: r.title,
            descriptionMd: r.description_md,
            isDeleted: r.is_deleted,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            closedAt: r.closed_at,
            clientTicketNumber: r.client_ticket_number,
        };
    });
}
/**
 * Get single ticket with role-based access control
 */
function getTicket(tx, ticketId, userRole, userId, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT
            t.id,
            t.project_id,
            p.name AS project_name,
            p.client_id,
            c.name AS client_name,
            t.client_ticket_number,
            c.organization_id,
            t.raised_by_user_id,
            raised_by.full_name AS raised_by_name,
            raised_by.email AS raised_by_email,
            t.assigned_to_user_id,
            assigned_to.full_name AS assigned_to_name,
            assigned_to.email AS assigned_to_email,
            t.stream_id,
            st.name AS stream_name,
            parent_st.id AS parent_stream_id,
            parent_st.name AS parent_stream_name,
            t.subject_id,
            sbj.name AS subject_name,
            t.priority_id,
            pr.name AS priority_name,
            t.status_id,
            s.name AS status_name,
            t.title,
            t.description_md,
            t.is_deleted,
            t.created_at,
            t.updated_at,
            t.closed_at
     FROM ticket t
     JOIN project p ON p.id = t.project_id
     JOIN client c ON c.id = p.client_id
     JOIN stream st ON st.id = t.stream_id
     LEFT JOIN stream parent_st ON parent_st.id = st.parent_stream_id
     JOIN subject sbj ON sbj.id = t.subject_id
     JOIN priority pr ON pr.id = t.priority_id
     JOIN status s ON s.id = t.status_id
     JOIN app_user raised_by ON raised_by.id = t.raised_by_user_id
     LEFT JOIN app_user assigned_to ON assigned_to.id = t.assigned_to_user_id
     WHERE t.id = $1 AND t.is_deleted = false`, [ticketId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Ticket not found');
        const r = rows[0];
        // Role-based access control
        if (userRole && userId) {
            if (userRole === 'ADMIN') {
                // Admin can access tickets in their organization
                // This would need organization context, but for now we'll assume the ticket exists
            }
            else if (userRole === 'EMPLOYEE') {
                // Employee can only access tickets assigned to them or raised by them
                if (r.assigned_to_user_id !== userId && r.raised_by_user_id !== userId) {
                    throw (0, errors_1.forbidden)('Access denied: ticket not assigned to you or raised by you');
                }
            }
            else if (userRole === 'CLIENT') {
                // Client can only access tickets from their client
                if (r.client_id !== clientId)
                    throw (0, errors_1.forbidden)('Access denied: ticket belongs to different client');
            }
        }
        return {
            id: r.id,
            projectId: r.project_id,
            projectName: r.project_name,
            clientId: r.client_id,
            clientName: r.client_name,
            clientTicketNumber: r.client_ticket_number,
            raisedByUserId: r.raised_by_user_id,
            raisedByName: r.raised_by_name,
            raisedByEmail: r.raised_by_email,
            assignedToUserId: r.assigned_to_user_id,
            assignedToName: r.assigned_to_name,
            assignedToEmail: r.assigned_to_email,
            streamId: r.stream_id,
            streamName: r.stream_name,
            parentStreamId: r.parent_stream_id,
            parentStreamName: r.parent_stream_name,
            subjectId: r.subject_id,
            subjectName: r.subject_name,
            priorityId: r.priority_id,
            priorityName: r.priority_name,
            statusId: r.status_id,
            statusName: r.status_name,
            title: r.title,
            descriptionMd: r.description_md,
            isDeleted: r.is_deleted,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            closedAt: r.closed_at,
        };
    });
}
/**
 * Soft delete ticket
 */
function deleteTicket(tx, ticketId, deletedByUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        // First check if ticket exists
        const { rows: checkRows } = yield tx.query('SELECT id FROM ticket WHERE id = $1 AND is_deleted = false', [ticketId]);
        if (checkRows.length === 0)
            throw (0, errors_1.notFound)('Ticket not found');
        // Soft delete the ticket (no event needed for soft delete)
        yield tx.query('UPDATE ticket SET is_deleted = true WHERE id = $1', [ticketId]);
    });
}
