import { PoolClient } from 'pg';
import { Role } from '../types/common';
import { notFound } from '../utils/errors';

export interface DashboardMetrics {
  tickets: {
    total: number;
    open: number;
    closed: number;
    byStatus: Array<{ statusId: string; statusName: string; count: number }>;
    byPriority: Array<{ priorityId: string; priorityName: string; count: number }>;
    assignedToMe?: number; // For employees
  };
  projects: {
    total: number;
    active: number;
  };
  clients?: {
    total: number;
    active: number;
  };
  users?: {
    total: number;
    active: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'TICKET_CREATED' | 'TICKET_UPDATED' | 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED';
  ticketId: string;
  ticketTitle: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  createdAt: Date;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    commentBody?: string;
    visibility?: string;
  };
}

/**
 * Get dashboard metrics scoped by user role
 */
export async function getDashboardMetrics(
  tx: PoolClient,
  organizationId: string,
  userRole: Role,
  userId: string,
  clientId: string | null
): Promise<DashboardMetrics> {
  const metrics: DashboardMetrics = {
    tickets: {
      total: 0,
      open: 0,
      closed: 0,
      byStatus: [],
      byPriority: [],
    },
    projects: {
      total: 0,
      active: 0,
    },
  };

  // Build ticket query conditions based on role
  const ticketConditions: string[] = ['t.is_deleted = false'];
  const ticketParams: any[] = [];
  let paramIndex = 1;

  if (userRole === 'ADMIN') {
    // ADMIN: all tickets in organization
    ticketConditions.push(`c.organization_id = $${paramIndex}`);
    ticketParams.push(organizationId);
    paramIndex++;
  } else if (userRole === 'EMPLOYEE') {
    // EMPLOYEE: tickets assigned to them OR raised by them
    ticketConditions.push(`(t.assigned_to_user_id = $${paramIndex} OR t.raised_by_user_id = $${paramIndex})`);
    ticketParams.push(userId);
    paramIndex++;
  } else if (userRole === 'CLIENT') {
    // CLIENT: tickets for their client's projects
    ticketConditions.push(`p.client_id = $${paramIndex}`);
    ticketParams.push(clientId);
    paramIndex++;
  }

  const ticketWhereClause = ticketConditions.join(' AND ');

  // Get ticket counts
  const { rows: ticketCounts } = await tx.query(
    `SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE s.is_closed = false)::int as open,
      COUNT(*) FILTER (WHERE s.is_closed = true)::int as closed
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN status s ON s.id = t.status_id
    WHERE ${ticketWhereClause}`,
    ticketParams
  );

  if (ticketCounts.length > 0) {
    metrics.tickets.total = ticketCounts[0].total;
    metrics.tickets.open = ticketCounts[0].open;
    metrics.tickets.closed = ticketCounts[0].closed;
  }

  // Get tickets by status
  const { rows: byStatus } = await tx.query(
    `SELECT
      s.id as status_id,
      s.name as status_name,
      COUNT(*)::int as count
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN status s ON s.id = t.status_id
    WHERE ${ticketWhereClause}
    GROUP BY s.id, s.name
    ORDER BY s.sequence, s.name`,
    ticketParams
  );
  metrics.tickets.byStatus = byStatus.map(r => ({
    statusId: r.status_id,
    statusName: r.status_name,
    count: r.count,
  }));

  // Get tickets by priority
  const { rows: byPriority } = await tx.query(
    `SELECT
      pr.id as priority_id,
      pr.name as priority_name,
      COUNT(*)::int as count
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN priority pr ON pr.id = t.priority_id
    WHERE ${ticketWhereClause}
    GROUP BY pr.id, pr.name
    ORDER BY pr.rank`,
    ticketParams
  );
  metrics.tickets.byPriority = byPriority.map(r => ({
    priorityId: r.priority_id,
    priorityName: r.priority_name,
    count: r.count,
  }));

  // For employees, get tickets assigned to them
  if (userRole === 'EMPLOYEE') {
    const { rows: assignedCount } = await tx.query(
      `SELECT COUNT(*)::int as count
       FROM ticket t
       JOIN project p ON p.id = t.project_id
       JOIN client c ON c.id = p.client_id
       WHERE ${ticketWhereClause} AND t.assigned_to_user_id = $${paramIndex}`,
      [...ticketParams, userId]
    );
    metrics.tickets.assignedToMe = assignedCount[0]?.count || 0;
  }

  // Get project counts
  const projectConditions: string[] = [];
  const projectParams: any[] = [];
  let projectParamIndex = 1;

  if (userRole === 'ADMIN') {
    projectConditions.push(`c.organization_id = $${projectParamIndex}`);
    projectParams.push(organizationId);
    projectParamIndex++;
  } else if (userRole === 'EMPLOYEE') {
    projectConditions.push(`c.organization_id = $${projectParamIndex}`);
    projectParams.push(organizationId);
    projectParamIndex++;
    projectConditions.push(`EXISTS (
      SELECT 1 FROM project_member pm
      WHERE pm.project_id = p.id AND pm.user_id = $${projectParamIndex}
    )`);
    projectParams.push(userId);
    projectParamIndex++;
  } else if (userRole === 'CLIENT') {
    projectConditions.push(`p.client_id = $${projectParamIndex}`);
    projectParams.push(clientId);
    projectParamIndex++;
  }

  const projectWhereClause = projectConditions.length > 0 ? `WHERE ${projectConditions.join(' AND ')}` : '';

  const { rows: projectCounts } = await tx.query(
    `SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE p.active = true)::int as active
    FROM project p
    JOIN client c ON c.id = p.client_id
    ${projectWhereClause}`,
    projectParams
  );

  if (projectCounts.length > 0) {
    metrics.projects.total = projectCounts[0].total;
    metrics.projects.active = projectCounts[0].active;
  }

  // Admin-only metrics
  if (userRole === 'ADMIN') {
    // Client counts
    const { rows: clientCounts } = await tx.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE active = true)::int as active
      FROM client
      WHERE organization_id = $1`,
      [organizationId]
    );
    metrics.clients = {
      total: clientCounts[0]?.total || 0,
      active: clientCounts[0]?.active || 0,
    };

    // User counts
    const { rows: userCounts } = await tx.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE is_active = true)::int as active
      FROM app_user
      WHERE organization_id = $1`,
      [organizationId]
    );
    metrics.users = {
      total: userCounts[0]?.total || 0,
      active: userCounts[0]?.active || 0,
    };
  }

  return metrics;
}

/**
 * Get recent activity scoped by user role
 */
export async function getRecentActivity(
  tx: PoolClient,
  organizationId: string,
  userRole: Role,
  userId: string,
  clientId: string | null,
  limit: number = 20
): Promise<RecentActivity[]> {
  // Build conditions for tickets the user can see
  const ticketConditions: string[] = ['t.is_deleted = false'];
  const ticketParams: any[] = [];
  let paramIndex = 1;

  if (userRole === 'ADMIN') {
    ticketConditions.push(`c.organization_id = $${paramIndex}`);
    ticketParams.push(organizationId);
    paramIndex++;
  } else if (userRole === 'EMPLOYEE') {
    ticketConditions.push(`(t.assigned_to_user_id = $${paramIndex} OR t.raised_by_user_id = $${paramIndex})`);
    ticketParams.push(userId);
    paramIndex++;
  } else if (userRole === 'CLIENT') {
    ticketConditions.push(`p.client_id = $${paramIndex}`);
    ticketParams.push(clientId);
    paramIndex++;
  }

  const ticketWhereClause = ticketConditions.join(' AND ');

  // Get recent ticket events
  const { rows: events } = await tx.query(
    `SELECT
      te.id,
      te.event_type,
      te.ticket_id,
      t.title as ticket_title,
      te.actor_id,
      actor.full_name as actor_name,
      actor.email as actor_email,
      p.id as project_id,
      p.name as project_name,
      c.id as client_id,
      c.name as client_name,
      te.old_value,
      te.new_value,
      te.created_at
    FROM ticket_event te
    JOIN ticket t ON t.id = te.ticket_id
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN app_user actor ON actor.id = te.actor_id
    WHERE ${ticketWhereClause}
    ORDER BY te.created_at DESC
    LIMIT $${paramIndex}`,
    [...ticketParams, limit]
  );

  // Get recent comments
  const { rows: comments } = await tx.query(
    `SELECT
      tc.id,
      tc.ticket_id,
      t.title as ticket_title,
      tc.author_id as actor_id,
      author.full_name as actor_name,
      author.email as actor_email,
      p.id as project_id,
      p.name as project_name,
      c.id as client_id,
      c.name as client_name,
      tc.visibility,
      tc.body_md,
      tc.created_at
    FROM ticket_comment tc
    JOIN ticket t ON t.id = tc.ticket_id
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN app_user author ON author.id = tc.author_id
    WHERE ${ticketWhereClause}
      ${userRole === 'CLIENT' ? "AND tc.visibility = 'PUBLIC'" : ''}
    ORDER BY tc.created_at DESC
    LIMIT $${paramIndex}`,
    [...ticketParams, limit]
  );

  // Combine and format activities
  const activities: RecentActivity[] = [];

  // Add events
  for (const event of events) {
    let type: RecentActivity['type'] = 'TICKET_UPDATED';
    if (event.event_type === 'TICKET_CREATED') {
      type = 'TICKET_CREATED';
    } else if (event.event_type === 'STATUS_CHANGED') {
      type = 'STATUS_CHANGED';
    } else if (event.event_type === 'ASSIGNEE_CHANGED') {
      type = 'ASSIGNEE_CHANGED';
    }

    activities.push({
      id: event.id,
      type,
      ticketId: event.ticket_id,
      ticketTitle: event.ticket_title,
      actorId: event.actor_id,
      actorName: event.actor_name,
      actorEmail: event.actor_email,
      projectId: event.project_id,
      projectName: event.project_name,
      clientId: event.client_id,
      clientName: event.client_name,
      createdAt: event.created_at,
      metadata: {
        oldValue: event.old_value,
        newValue: event.new_value,
      },
    });
  }

  // Add comments
  for (const comment of comments) {
    activities.push({
      id: comment.id,
      type: 'COMMENT_ADDED',
      ticketId: comment.ticket_id,
      ticketTitle: comment.ticket_title,
      actorId: comment.actor_id,
      actorName: comment.actor_name,
      actorEmail: comment.actor_email,
      projectId: comment.project_id,
      projectName: comment.project_name,
      clientId: comment.client_id,
      clientName: comment.client_name,
      createdAt: comment.created_at,
      metadata: {
        commentBody: comment.body_md,
        visibility: comment.visibility,
      },
    });
  }

  // Sort by created_at descending and limit
  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return activities.slice(0, limit);
}

export interface UserActivityMetrics {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    clientId: string | null;
    clientName: string | null;
    isActive: boolean;
    createdAt: Date;
  };
  tickets: {
    created: number;
    assigned: number;
    closed: number;
    open: number;
    byStatus: Array<{ statusId: string; statusName: string; count: number }>;
    byPriority: Array<{ priorityId: string; priorityName: string; count: number }>;
  };
  activity: {
    totalEvents: number;
    totalComments: number;
    eventsByType: Array<{ eventType: string; count: number }>;
    lastActivityAt: Date | null;
  };
  performance: {
    averageResponseTime?: number; // in hours (time to first comment/action)
    averageResolutionTime?: number; // in hours (time to close)
    ticketsClosedLast30Days: number;
    ticketsCreatedLast30Days: number;
    commentsLast30Days: number;
  };
  projects: {
    total: number;
    active: number;
    asManager: number;
    asMember: number;
  };
}

/**
 * Get user activity and performance metrics (ADMIN only)
 * Shows comprehensive view of what a user is up to
 */
export async function getUserActivityMetrics(
  tx: PoolClient,
  organizationId: string,
  targetUserId: string
): Promise<UserActivityMetrics> {
  // Get user info
  const { rows: userRows } = await tx.query(
    `SELECT
      u.id, u.email, u.full_name, u.user_type, u.client_id, u.is_active, u.created_at,
      c.name as client_name
    FROM app_user u
    LEFT JOIN client c ON c.id = u.client_id
    WHERE u.id = $1 AND u.organization_id = $2`,
    [targetUserId, organizationId]
  );

  if (userRows.length === 0) throw notFound('User not found');

  const user = userRows[0];
  const userRole = user.user_type as Role;

  // Get ticket metrics
  const { rows: ticketMetrics } = await tx.query(
    `SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE t.raised_by_user_id = $1)::int as created,
      COUNT(*) FILTER (WHERE t.assigned_to_user_id = $1)::int as assigned,
      COUNT(*) FILTER (WHERE t.assigned_to_user_id = $1 AND s.is_closed = true)::int as closed,
      COUNT(*) FILTER (WHERE t.assigned_to_user_id = $1 AND s.is_closed = false)::int as open
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN status s ON s.id = t.status_id
    WHERE t.is_deleted = false
      AND c.organization_id = $2
      AND (t.raised_by_user_id = $1 OR t.assigned_to_user_id = $1)`,
    [targetUserId, organizationId]
  );

  const ticketStats = ticketMetrics[0] || {
    total: 0,
    created: 0,
    assigned: 0,
    closed: 0,
    open: 0,
  };

  // Get tickets by status
  const { rows: byStatus } = await tx.query(
    `SELECT
      s.id as status_id,
      s.name as status_name,
      COUNT(*)::int as count
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN status s ON s.id = t.status_id
    WHERE t.is_deleted = false
      AND c.organization_id = $1
      AND (t.raised_by_user_id = $2 OR t.assigned_to_user_id = $2)
    GROUP BY s.id, s.name
    ORDER BY s.sequence, s.name`,
    [organizationId, targetUserId]
  );

  // Get tickets by priority
  const { rows: byPriority } = await tx.query(
    `SELECT
      pr.id as priority_id,
      pr.name as priority_name,
      COUNT(*)::int as count
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    JOIN priority pr ON pr.id = t.priority_id
    WHERE t.is_deleted = false
      AND c.organization_id = $1
      AND (t.raised_by_user_id = $2 OR t.assigned_to_user_id = $2)
    GROUP BY pr.id, pr.name
    ORDER BY pr.rank`,
    [organizationId, targetUserId]
  );

  // Get activity metrics
  const { rows: activityMetrics } = await tx.query(
    `SELECT
      COUNT(DISTINCT te.id)::int as total_events,
      COUNT(DISTINCT tc.id)::int as total_comments,
      MAX(GREATEST(COALESCE(te.created_at, '1970-01-01'::timestamptz), COALESCE(tc.created_at, '1970-01-01'::timestamptz))) as last_activity
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    LEFT JOIN ticket_event te ON te.ticket_id = t.id AND te.actor_id = $1
    LEFT JOIN ticket_comment tc ON tc.ticket_id = t.id AND tc.author_id = $1
    WHERE t.is_deleted = false
      AND c.organization_id = $2
      AND (t.raised_by_user_id = $1 OR t.assigned_to_user_id = $1)`,
    [targetUserId, organizationId]
  );

  const activityStats = activityMetrics[0] || {
    total_events: 0,
    total_comments: 0,
    last_activity: null,
  };

  // Get events by type
  const { rows: eventsByType } = await tx.query(
    `SELECT
      te.event_type,
      COUNT(*)::int as count
    FROM ticket_event te
    JOIN ticket t ON t.id = te.ticket_id
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    WHERE te.actor_id = $1
      AND c.organization_id = $2
      AND t.is_deleted = false
    GROUP BY te.event_type
    ORDER BY count DESC`,
    [targetUserId, organizationId]
  );

  // Get performance metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { rows: performanceMetrics } = await tx.query(
    `SELECT
      COUNT(*) FILTER (WHERE t.closed_at >= $3 AND t.assigned_to_user_id = $1)::int as closed_last_30,
      COUNT(*) FILTER (WHERE t.created_at >= $3 AND t.raised_by_user_id = $1)::int as created_last_30,
      COUNT(*) FILTER (WHERE tc.created_at >= $3 AND tc.author_id = $1)::int as comments_last_30
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    LEFT JOIN ticket_comment tc ON tc.ticket_id = t.id AND tc.author_id = $1
    WHERE t.is_deleted = false
      AND c.organization_id = $2
      AND (t.raised_by_user_id = $1 OR t.assigned_to_user_id = $1)`,
    [targetUserId, organizationId, thirtyDaysAgo]
  );

  const perfStats = performanceMetrics[0] || {
    closed_last_30: 0,
    created_last_30: 0,
    comments_last_30: 0,
  };

  // Calculate average response time (time to first comment/action on assigned tickets)
  const { rows: responseTimeRows } = await tx.query(
    `SELECT
      AVG(EXTRACT(EPOCH FROM (COALESCE(
        (SELECT MIN(tc.created_at) FROM ticket_comment tc WHERE tc.ticket_id = t.id AND tc.author_id = $1),
        (SELECT MIN(te.created_at) FROM ticket_event te WHERE te.ticket_id = t.id AND te.actor_id = $1 AND te.event_type != 'TICKET_CREATED')
      ) - t.created_at)) / 3600)::numeric(10,2) as avg_response_hours
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    WHERE t.is_deleted = false
      AND c.organization_id = $2
      AND t.assigned_to_user_id = $1
      AND t.created_at >= $3`,
    [targetUserId, organizationId, thirtyDaysAgo]
  );

  // Calculate average resolution time (time to close)
  const { rows: resolutionTimeRows } = await tx.query(
    `SELECT
      AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600)::numeric(10,2) as avg_resolution_hours
    FROM ticket t
    JOIN project p ON p.id = t.project_id
    JOIN client c ON c.id = p.client_id
    WHERE t.is_deleted = false
      AND c.organization_id = $2
      AND t.assigned_to_user_id = $1
      AND t.closed_at IS NOT NULL
      AND t.closed_at >= $3`,
    [targetUserId, organizationId, thirtyDaysAgo]
  );

  // Get project membership
  const { rows: projectMetrics } = await tx.query(
    `SELECT
      COUNT(DISTINCT pm.project_id)::int as total,
      COUNT(DISTINCT pm.project_id) FILTER (WHERE p.active = true)::int as active,
      COUNT(DISTINCT pm.project_id) FILTER (WHERE pm.role = 'MANAGER')::int as as_manager,
      COUNT(DISTINCT pm.project_id) FILTER (WHERE pm.role = 'MEMBER')::int as as_member
    FROM project_member pm
    JOIN project p ON p.id = pm.project_id
    JOIN client c ON c.id = p.client_id
    WHERE pm.user_id = $1 AND c.organization_id = $2`,
    [targetUserId, organizationId]
  );

  const projectStats = projectMetrics[0] || {
    total: 0,
    active: 0,
    as_manager: 0,
    as_member: 0,
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: userRole,
      clientId: user.client_id,
      clientName: user.client_name,
      isActive: user.is_active,
      createdAt: user.created_at,
    },
    tickets: {
      created: ticketStats.created,
      assigned: ticketStats.assigned,
      closed: ticketStats.closed,
      open: ticketStats.open,
      byStatus: byStatus.map(r => ({
        statusId: r.status_id,
        statusName: r.status_name,
        count: r.count,
      })),
      byPriority: byPriority.map(r => ({
        priorityId: r.priority_id,
        priorityName: r.priority_name,
        count: r.count,
      })),
    },
    activity: {
      totalEvents: activityStats.total_events,
      totalComments: activityStats.total_comments,
      eventsByType: eventsByType.map(r => ({
        eventType: r.event_type,
        count: r.count,
      })),
      lastActivityAt: activityStats.last_activity && activityStats.last_activity !== '1970-01-01' ? activityStats.last_activity : null,
    },
    performance: {
      averageResponseTime: responseTimeRows[0]?.avg_response_hours ? parseFloat(responseTimeRows[0].avg_response_hours) : undefined,
      averageResolutionTime: resolutionTimeRows[0]?.avg_resolution_hours ? parseFloat(resolutionTimeRows[0].avg_resolution_hours) : undefined,
      ticketsClosedLast30Days: perfStats.closed_last_30,
      ticketsCreatedLast30Days: perfStats.created_last_30,
      commentsLast30Days: perfStats.comments_last_30,
    },
    projects: {
      total: projectStats.total,
      active: projectStats.active,
      asManager: projectStats.as_manager,
      asMember: projectStats.as_member,
    },
  };
}

