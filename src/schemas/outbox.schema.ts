import { z } from 'zod';

export const ListOutboxQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const ProcessOutboxBody = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListOutboxQueryT = z.infer<typeof ListOutboxQuery>;
export type ProcessOutboxBodyT = z.infer<typeof ProcessOutboxBody>;
