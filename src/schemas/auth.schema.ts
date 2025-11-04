import { z } from 'zod';

export const AdminSignupBody = z.object({
  organizationName: z.string().min(1).max(255),
  fullName: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const LoginResponse = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    role: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']),
    clientId: z.string().uuid().nullable(),
    email: z.string().email(),
    fullName: z.string(),
  }),
});

export const MeResponse = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']),
  clientId: z.string().uuid().nullable(),
  email: z.string().email(),
  fullName: z.string(),
});

export type AdminSignupBodyT = z.infer<typeof AdminSignupBody>;
export type LoginBodyT = z.infer<typeof LoginBody>;
export type LoginResponseT = z.infer<typeof LoginResponse>;
export type MeResponseT = z.infer<typeof MeResponse>;
