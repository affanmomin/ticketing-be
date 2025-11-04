import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';
import { Role } from '../types/common';

export interface CommentResult {
  id: string;
  ticketId: string;
  authorId: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  bodyMd: string;
  createdAt: Date;
}

/**
 * List comments for a ticket with visibility enforcement
 * CLIENT users can only see PUBLIC comments
 * ADMIN/EMPLOYEE can see PUBLIC and INTERNAL comments
 */
export async function listComments(
  tx: PoolClient,
  ticketId: string,
  userRole: Role
): Promise<CommentResult[]> {
  const conditions: string[] = ['tc.ticket_id = $1'];
  const params: any[] = [ticketId];

  if (userRole === 'CLIENT') {
    conditions.push(`tc.visibility = 'PUBLIC'`);
  }

  const whereClause = conditions.join(' AND ');

  const { rows } = await tx.query(
    `SELECT tc.id, tc.ticket_id, tc.author_id, tc.visibility, tc.body_md, tc.created_at
     FROM ticket_comment tc
     WHERE ${whereClause}
     ORDER BY tc.created_at ASC`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    ticketId: r.ticket_id,
    authorId: r.author_id,
    visibility: r.visibility,
    bodyMd: r.body_md,
    createdAt: r.created_at,
  }));
}

/**
 * Create a comment
 * CLIENT users can only create PUBLIC comments
 * ADMIN/EMPLOYEE can create PUBLIC or INTERNAL comments
 */
export async function createComment(
  tx: PoolClient,
  ticketId: string,
  authorId: string,
  userRole: Role,
  visibility: 'PUBLIC' | 'INTERNAL',
  bodyMd: string
): Promise<CommentResult> {
  // Verify ticket exists
  const { rows: ticketRows } = await tx.query(
    'SELECT id FROM ticket WHERE id = $1',
    [ticketId]
  );
  if (ticketRows.length === 0) throw notFound('Ticket not found');

  // Enforce visibility rules
  if (userRole === 'CLIENT') {
    if (visibility !== 'PUBLIC') {
      throw forbidden('CLIENT users can only create PUBLIC comments');
    }
  }

  // Create comment
  const { rows } = await tx.query(
    `INSERT INTO ticket_comment (ticket_id, author_id, visibility, body_md)
     VALUES ($1, $2, $3, $4)
     RETURNING id, ticket_id, author_id, visibility, body_md, created_at`,
    [ticketId, authorId, visibility, bodyMd]
  );

  const comment = rows[0];

  // Create COMMENT_ADDED event
  await tx.query(
    `INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
     VALUES ($1, $2, 'COMMENT_ADDED', $3::jsonb)`,
    [ticketId, authorId, JSON.stringify({ visibility, body: bodyMd })]
  );

  // Add to notification outbox
  await tx.query(
    `INSERT INTO notification_outbox (topic, ticket_id, recipient_user_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      'COMMENT_ADDED',
      ticketId,
      authorId,
      JSON.stringify({ subject: 'New comment on ticket', body: bodyMd }),
    ]
  );

  return {
    id: comment.id,
    ticketId: comment.ticket_id,
    authorId: comment.author_id,
    visibility: comment.visibility,
    bodyMd: comment.body_md,
    createdAt: comment.created_at,
  };
}

/**
 * Get single comment (with visibility enforcement)
 */
export async function getComment(
  tx: PoolClient,
  commentId: string,
  userRole: Role
): Promise<CommentResult> {
  const { rows } = await tx.query(
    `SELECT id, ticket_id, author_id, visibility, body_md, created_at
     FROM ticket_comment
     WHERE id = $1`,
    [commentId]
  );

  if (rows.length === 0) throw notFound('Comment not found');

  const comment = rows[0];

  // Enforce visibility rules
  if (userRole === 'CLIENT' && comment.visibility !== 'PUBLIC') {
    throw forbidden('You do not have permission to view this comment');
  }

  return {
    id: comment.id,
    ticketId: comment.ticket_id,
    authorId: comment.author_id,
    visibility: comment.visibility,
    bodyMd: comment.body_md,
    createdAt: comment.created_at,
  };
}
