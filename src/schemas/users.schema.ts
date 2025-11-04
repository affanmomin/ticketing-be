import { z } from 'zod';

export const CreateEmployeeBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
});

export const CreateClientUserBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  clientId: z.string().uuid(),
});

export const UpdateUserBody = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export const ChangePasswordBody = z.object({
  password: z.string().min(8),
});

export const ListUsersQuery = z.object({
  userType: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']).optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateEmployeeBodyT = z.infer<typeof CreateEmployeeBody>;
export type CreateClientUserBodyT = z.infer<typeof CreateClientUserBody>;
export type UpdateUserBodyT = z.infer<typeof UpdateUserBody>;
export type ChangePasswordBodyT = z.infer<typeof ChangePasswordBody>;
export type ListUsersQueryT = z.infer<typeof ListUsersQuery>;
