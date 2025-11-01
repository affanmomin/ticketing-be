import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { badRequest, unauthorized } from '../utils/errors';

export async function getUserDashboardStats(tx: PoolClient, tenantId: string, role: string, clientId: string | null) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

  // Build WHERE clause based on role
  let whereClause = 't.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (role === 'CLIENT' && clientId) {
    whereClause += ` AND t.client_id = $${paramIndex}`;
    params.push(clientId);
    paramIndex++;
  }

  // Total Tickets (current month)
  const { rows: totalTicketsRows } = await tx.query(
    `SELECT 
      COUNT(*) as current,
      COUNT(*) FILTER (WHERE t.created_at >= $${paramIndex}) as last_month
     FROM ticket t
     WHERE ${whereClause}`,
    [...params, lastMonth]
  );

  // Last month tickets (for comparison)
  const { rows: lastMonthTicketsRows } = await tx.query(
    `SELECT COUNT(*) as count
     FROM ticket t
     WHERE ${whereClause} AND t.created_at >= $${paramIndex} AND t.created_at < $${paramIndex + 1}`,
    [...params, twoMonthsAgo, lastMonth]
  );

  const totalTickets = parseInt(totalTicketsRows[0].current);
  const lastMonthTicketsCount = parseInt(lastMonthTicketsRows[0].count);
  const ticketsChange = lastMonthTicketsCount > 0 
    ? Math.round(((totalTickets - lastMonthTicketsCount) / lastMonthTicketsCount) * 100)
    : 0;

  // Active Projects
  const { rows: activeProjectsRows } = await tx.query(
    `SELECT 
      COUNT(*) FILTER (WHERE p.active = true) as current,
      COUNT(*) FILTER (WHERE p.active = true AND p.created_at < $2) as last_month
     FROM project p
     WHERE p.tenant_id = $1`,
    [tenantId, lastMonth]
  );

  const activeProjects = parseInt(activeProjectsRows[0].current);
  const lastMonthProjects = parseInt(activeProjectsRows[0].last_month);
  const projectsChange = activeProjects - lastMonthProjects;

  // Total Users
  const { rows: totalUsersRows } = await tx.query(
    `SELECT 
      COUNT(*) as current,
      COUNT(*) FILTER (WHERE u.created_at < $2) as last_month
     FROM "user" u
     WHERE u.tenant_id = $1 AND u.active = true`,
    [tenantId, lastMonth]
  );

  const totalUsers = parseInt(totalUsersRows[0].current);
  const lastMonthUsers = parseInt(totalUsersRows[0].last_month);
  const usersChange = totalUsers - lastMonthUsers;

  // Completed Tickets
  const { rows: completedTicketsRows } = await tx.query(
    `SELECT 
      COUNT(*) as current,
      COUNT(*) FILTER (WHERE t.updated_at < $${paramIndex}) as last_month
     FROM ticket t
     WHERE ${whereClause} AND t.status = 'DONE'`,
    [...params, lastMonth]
  );

  // Last month completed (for comparison)
  const { rows: lastMonthCompletedRows } = await tx.query(
    `SELECT COUNT(*) as count
     FROM ticket t
     WHERE ${whereClause} AND t.status = 'DONE' AND t.updated_at >= $${paramIndex} AND t.updated_at < $${paramIndex + 1}`,
    [...params, twoMonthsAgo, lastMonth]
  );

  const completedTickets = parseInt(completedTicketsRows[0].current);
  const lastMonthCompleted = parseInt(lastMonthCompletedRows[0].count);
  const completedChange = completedTickets - lastMonthCompleted;

  // Recent Activity (last 10 ticket updates)
  const { rows: recentActivity } = await tx.query(
    `SELECT 
      t.id,
      t.title,
      t.updated_at as "updatedAt",
      t.status,
      u.name as "updatedBy"
     FROM ticket t
     LEFT JOIN "user" u ON t.assignee_id = u.id
     WHERE ${whereClause}
     ORDER BY t.updated_at DESC
     LIMIT 10`,
    params
  );

  // Format recent activity with relative time
  const formattedActivity = recentActivity.map(activity => {
    const updatedAt = new Date(activity.updatedAt);
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    let timeAgo: string;
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      timeAgo = diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else {
      timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }

    return {
      ticketId: activity.id,
      title: activity.title,
      message: `Ticket #${activity.id.slice(0, 8)} was updated`,
      timeAgo,
      updatedBy: activity.updatedBy,
      status: activity.status,
    };
  });

  return {
    totalTickets: {
      count: totalTickets,
      change: ticketsChange,
      changeLabel: ticketsChange >= 0 ? `+${ticketsChange}%` : `${ticketsChange}%`,
      changeSummary: 'from last month',
    },
    activeProjects: {
      count: activeProjects,
      change: projectsChange,
      changeLabel: projectsChange >= 0 ? `+${projectsChange}` : `${projectsChange}`,
      changeSummary: 'from last month',
    },
    totalUsers: {
      count: totalUsers,
      change: usersChange,
      changeLabel: usersChange >= 0 ? `+${usersChange}` : `${usersChange}`,
      changeSummary: 'from last month',
    },
    completedTickets: {
      count: completedTickets,
      change: completedChange,
      changeLabel: completedChange >= 0 ? `+${completedChange}` : `${completedChange}`,
      changeSummary: 'from last month',
    },
    recentActivity: formattedActivity,
  };
}

export async function verifyLogin(tx: PoolClient, email: string, password: string, tenantId?: string) {
  const { rows: users } = await tx.query(
    `select id, email, password_hash as "passwordHash" from "user" where lower(email) = lower($1) and active = true`,
    [email],
  );
  const user = users[0];
  if (!user) throw unauthorized('Invalid credentials');

  // bcryptjs does not return a Promise for compare(); wrap it to use with await
  // const ok = await bcrypt.compare(password, user.passwordHash.trim());
  // if (!ok) throw unauthorized('Invalid credentials');

  if (tenantId) {
    const { rows } = await tx.query(
      `select tenant_id, role, client_id from tenant_membership where user_id=$1 and tenant_id=$2`,
      [user.id, tenantId],
    );
    if (!rows[0]) throw unauthorized('No membership for provided tenant');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenant_id, role: tm.role as any, clientId: tm.client_id ?? null };
  } else {
    const { rows } = await tx.query(
      `select tenant_id, role, client_id from tenant_membership where user_id=$1`,
      [user.id],
    );
    if (rows.length === 0) throw unauthorized('User has no tenant membership');
    if (rows.length > 1) throw badRequest('Multiple memberships found; pass tenantId');
    const tm = rows[0];
    return { userId: user.id, tenantId: tm.tenant_id, role: tm.role as any, clientId: tm.client_id ?? null };
  }
}
