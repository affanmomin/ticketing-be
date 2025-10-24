import { z } from 'zod';

export const CreateClientBody = z.object({
  name: z.string().min(2),
  domain: z.string().min(3).optional(),
  active: z.boolean().default(true),
});

export const UpdateClientBody = CreateClientBody.partial();

export type CreateClientBodyT = z.infer<typeof CreateClientBody>;
export type UpdateClientBodyT = z.infer<typeof UpdateClientBody>;
