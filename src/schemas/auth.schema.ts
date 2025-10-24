import { z } from 'zod';

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().uuid().optional(), // required if user has >1 membership
});

export type LoginBodyT = z.infer<typeof LoginBody>;
