import { z } from 'zod';

export const CreateProjectBody = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(2),
  code: z.string().min(2).max(12),
  active: z.boolean().default(true),
});

export const UpdateProjectBody = CreateProjectBody.partial();

export type CreateProjectBodyT = z.infer<typeof CreateProjectBody>;
export type UpdateProjectBodyT = z.infer<typeof UpdateProjectBody>;
