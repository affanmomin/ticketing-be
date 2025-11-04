import { z } from 'zod';

export const CreateCommentBody = z.object({
  visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
  bodyMd: z.string().min(1),
});

export type CreateCommentBodyT = z.infer<typeof CreateCommentBody>;
