import { z } from 'zod';

export const ListStreamsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreateStreamBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  parentStreamId: z.string().uuid().optional(),
});

export const UpdateStreamBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
  parentStreamId: z.string().uuid().optional(),
});

export type ListStreamsQueryT = z.infer<typeof ListStreamsQuery>;
export type CreateStreamBodyT = z.infer<typeof CreateStreamBody>;
export type UpdateStreamBodyT = z.infer<typeof UpdateStreamBody>;
