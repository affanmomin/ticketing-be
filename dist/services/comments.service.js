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
exports.listComments = listComments;
exports.createComment = createComment;
exports.getComment = getComment;
const errors_1 = require("../utils/errors");
/**
 * List comments for a ticket with visibility enforcement
 * CLIENT users can only see PUBLIC comments
 * ADMIN/EMPLOYEE can see PUBLIC and INTERNAL comments
 */
function listComments(tx, ticketId, userRole) {
    return __awaiter(this, void 0, void 0, function* () {
        const conditions = ['tc.ticket_id = $1'];
        const params = [ticketId];
        if (userRole === 'CLIENT') {
            conditions.push(`tc.visibility = 'PUBLIC'`);
        }
        const whereClause = conditions.join(' AND ');
        const { rows } = yield tx.query(`SELECT tc.id, tc.ticket_id, tc.author_id, tc.visibility, tc.body_md, tc.created_at
     FROM ticket_comment tc
     WHERE ${whereClause}
     ORDER BY tc.created_at ASC`, params);
        return rows.map(r => ({
            id: r.id,
            ticketId: r.ticket_id,
            authorId: r.author_id,
            visibility: r.visibility,
            bodyMd: r.body_md,
            createdAt: r.created_at,
        }));
    });
}
/**
 * Create a comment
 * CLIENT users can only create PUBLIC comments
 * ADMIN/EMPLOYEE can create PUBLIC or INTERNAL comments
 */
function createComment(tx, ticketId, authorId, userRole, visibility, bodyMd) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verify ticket exists
        const { rows: ticketRows } = yield tx.query('SELECT id FROM ticket WHERE id = $1', [ticketId]);
        if (ticketRows.length === 0)
            throw (0, errors_1.notFound)('Ticket not found');
        // Enforce visibility rules
        if (userRole === 'CLIENT') {
            if (visibility !== 'PUBLIC') {
                throw (0, errors_1.forbidden)('CLIENT users can only create PUBLIC comments');
            }
        }
        // Create comment
        const { rows } = yield tx.query(`INSERT INTO ticket_comment (ticket_id, author_id, visibility, body_md)
     VALUES ($1, $2, $3, $4)
     RETURNING id, ticket_id, author_id, visibility, body_md, created_at`, [ticketId, authorId, visibility, bodyMd]);
        const comment = rows[0];
        // Create COMMENT_ADDED event
        yield tx.query(`INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
     VALUES ($1, $2, 'COMMENT_ADDED', $3::jsonb)`, [ticketId, authorId, JSON.stringify({ visibility, body: bodyMd })]);
        // Add to notification outbox
        yield tx.query(`INSERT INTO notification_outbox (topic, ticket_id, recipient_user_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`, [
            'COMMENT_ADDED',
            ticketId,
            authorId,
            JSON.stringify({ subject: 'New comment on ticket', body: bodyMd }),
        ]);
        return {
            id: comment.id,
            ticketId: comment.ticket_id,
            authorId: comment.author_id,
            visibility: comment.visibility,
            bodyMd: comment.body_md,
            createdAt: comment.created_at,
        };
    });
}
/**
 * Get single comment (with visibility enforcement)
 */
function getComment(tx, commentId, userRole) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, ticket_id, author_id, visibility, body_md, created_at
     FROM ticket_comment
     WHERE id = $1`, [commentId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Comment not found');
        const comment = rows[0];
        // Enforce visibility rules
        if (userRole === 'CLIENT' && comment.visibility !== 'PUBLIC') {
            throw (0, errors_1.forbidden)('You do not have permission to view this comment');
        }
        return {
            id: comment.id,
            ticketId: comment.ticket_id,
            authorId: comment.author_id,
            visibility: comment.visibility,
            bodyMd: comment.body_md,
            createdAt: comment.created_at,
        };
    });
}
