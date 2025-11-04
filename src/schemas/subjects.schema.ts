import { z } from 'zod';

export const ListSubjectsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreateSubjectBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const UpdateSubjectBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export type ListSubjectsQueryT = z.infer<typeof ListSubjectsQuery>;
export type CreateSubjectBodyT = z.infer<typeof CreateSubjectBody>;
export type UpdateSubjectBodyT = z.infer<typeof UpdateSubjectBody>;
