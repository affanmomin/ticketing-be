import { z } from 'zod';

export const CreateStreamBody = z.object({ projectId: z.string().uuid(), name: z.string().min(2) });
export const UpdateStreamBody = CreateStreamBody.partial();

export type CreateStreamBodyT = z.infer<typeof CreateStreamBody>;
export type UpdateStreamBodyT = z.infer<typeof UpdateStreamBody>;
