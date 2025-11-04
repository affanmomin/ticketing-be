import { z } from 'zod';

export const CreateClientBody = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export const UpdateClientBody = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

export const ListClientsQuery = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateClientBodyT = z.infer<typeof CreateClientBody>;
export type UpdateClientBodyT = z.infer<typeof UpdateClientBody>;
export type ListClientsQueryT = z.infer<typeof ListClientsQuery>;
