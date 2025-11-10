import { z } from 'zod';

export const DashboardMetricsQuery = z.object({
  // Optional filters for future use
}).strict();

export const RecentActivityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
}).strict();

export type DashboardMetricsQueryT = z.infer<typeof DashboardMetricsQuery>;
export type RecentActivityQueryT = z.infer<typeof RecentActivityQuery>;

