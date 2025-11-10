import { FastifyRequest, FastifyReply } from 'fastify';
import { getDashboardMetrics, getRecentActivity, getUserActivityMetrics } from '../services/dashboard.service';
import { DashboardMetricsQuery, RecentActivityQuery } from '../schemas/dashboard.schema';
import { IdParam } from '../schemas/common.schema';
import { unauthorized, forbidden } from '../utils/errors';
import { withReadOnly } from '../db/helpers';

/**
 * GET /dashboard/metrics - Get dashboard metrics
 * Scoped by user role:
 * - ADMIN: sees all organization data
 * - EMPLOYEE: sees their assigned/raised tickets and projects
 * - CLIENT: sees their client's tickets and projects
 */
export async function getMetricsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = DashboardMetricsQuery.parse(req.query);

  const metrics = await withReadOnly(async (client) => {
    return await getDashboardMetrics(
      client,
      req.user!.organizationId,
      req.user!.role,
      req.user!.userId,
      req.user!.clientId ?? null
    );
  });

  return reply.send(metrics);
}

/**
 * GET /dashboard/activity - Get recent activity
 * Scoped by user role:
 * - ADMIN: sees all organization activity
 * - EMPLOYEE: sees activity for their tickets
 * - CLIENT: sees activity for their client's tickets (PUBLIC comments only)
 */
export async function getActivityCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const query = RecentActivityQuery.parse(req.query);

  const activity = await withReadOnly(async (client) => {
    return await getRecentActivity(
      client,
      req.user!.organizationId,
      req.user!.role,
      req.user!.userId,
      req.user!.clientId ?? null,
      query.limit
    );
  });

  return reply.send(activity);
}

/**
 * GET /dashboard/users/:id/activity - Get user activity and performance metrics
 * ADMIN only - shows what a specific user is up to
 */
export async function getUserActivityCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');
  if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view user activity');

  const { id: userId } = IdParam.parse(req.params);

  const metrics = await withReadOnly(async (client) => {
    return await getUserActivityMetrics(
      client,
      req.user!.organizationId,
      userId
    );
  });

  return reply.send(metrics);
}

