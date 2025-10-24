import { z } from 'zod';

export const CreateTagBody = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/),
  clientId: z.string().uuid().optional(),
});

export type CreateTagBodyT = z.infer<typeof CreateTagBody>;
