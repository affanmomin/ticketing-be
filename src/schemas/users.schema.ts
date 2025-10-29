import { z } from 'zod';

// User type enum matching database
export const UserType = z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']);
export type UserTypeT = z.infer<typeof UserType>;

// Schema for creating a new user (admin creates employee users)
export const CreateUserBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  userType: UserType.default('EMPLOYEE'),
  clientCompanyId: z.string().uuid().optional(), // Optional association with a client company
  active: z.boolean().default(true),
});

export type CreateUserBodyT = z.infer<typeof CreateUserBody>;

// Schema for updating user
export const UpdateUserBody = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  userType: UserType.optional(),
  clientCompanyId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

export type UpdateUserBodyT = z.infer<typeof UpdateUserBody>;

// Query params for listing users
export const ListUsersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  userType: UserType.optional(),
  clientCompanyId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(), // Search by name or email
});

export type ListUsersQueryT = z.infer<typeof ListUsersQuery>;

// Schema for user response (without password)
export const UserResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  userType: UserType.nullable(),
  tenantId: z.string().uuid().nullable(),
  clientCompanyId: z.string().uuid().nullable().optional(),
  clientCompanyName: z.string().nullable().optional(),
  active: z.boolean(),
  lastSignInAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserResponseT = z.infer<typeof UserResponse>;
