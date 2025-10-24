import { z } from 'zod';

export const AddCommentBody = z.object({ ticketId: z.string().uuid(), bodyMd: z.string().min(1) });
export type AddCommentBodyT = z.infer<typeof AddCommentBody>;
