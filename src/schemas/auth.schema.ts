import { z } from 'zod';

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid().optional(), // only required if user has multiple tenant memberships
});

export type LoginBodyT = z.infer<typeof LoginBody>;
