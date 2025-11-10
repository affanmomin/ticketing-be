import { FastifyInstance } from 'fastify';
import { getMetricsCtrl, getActivityCtrl, getUserActivityCtrl } from '../controllers/dashboard.controller';
import { DashboardMetricsQuery, RecentActivityQuery } from '../schemas/dashboard.schema';
import { IdParam } from '../schemas/common.schema';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/metrics',
    { schema: { querystring: DashboardMetricsQuery } },
    getMetricsCtrl
  );
  app.get(
    '/dashboard/activity',
    { schema: { querystring: RecentActivityQuery } },
    getActivityCtrl
  );
  app.get(
    '/dashboard/users/:id/activity',
    { schema: { params: IdParam } },
    getUserActivityCtrl
  );
}

