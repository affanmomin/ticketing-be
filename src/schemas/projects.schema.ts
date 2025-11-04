import { z } from 'zod';

export const ListProjectsQuery = z.object({
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
  active: z.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const isoDate = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);

export const CreateProjectBody = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

export const UpdateProjectBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  active: z.boolean().optional(),
});

export const AddProjectMemberBody = z.object({
  userId: z.string().uuid(),
  role: z.enum(['MEMBER', 'MANAGER', 'VIEWER']).default('MEMBER'),
  canRaise: z.boolean().default(false),
  canBeAssigned: z.boolean().default(false),
});

export const UpdateProjectMemberBody = z.object({
  role: z.enum(['MEMBER', 'MANAGER', 'VIEWER']).optional(),
  canRaise: z.boolean().optional(),
  canBeAssigned: z.boolean().optional(),
});

export const ProjectMemberParams = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type ListProjectsQueryT = z.infer<typeof ListProjectsQuery>;
export type CreateProjectBodyT = z.infer<typeof CreateProjectBody>;
export type UpdateProjectBodyT = z.infer<typeof UpdateProjectBody>;
export type AddProjectMemberBodyT = z.infer<typeof AddProjectMemberBody>;
export type UpdateProjectMemberBodyT = z.infer<typeof UpdateProjectMemberBody>;
export type ProjectMemberParamsT = z.infer<typeof ProjectMemberParams>;
