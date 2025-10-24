import { z } from 'zod';

export const IdParam = z.object({ id: z.string().uuid() });
export const PagingQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const SortQuery = z.object({ sort: z.string().optional() });

export type IdParamT = z.infer<typeof IdParam>;
export type PagingQueryT = z.infer<typeof PagingQuery>;
