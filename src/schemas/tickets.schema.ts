import { z } from 'zod';

export const ListTicketsQuery = z.object({
  projectId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreateTicketBody = z.object({
  projectId: z.string().uuid(),
  streamId: z.string().uuid(),
  subjectId: z.string().uuid(),
  priorityId: z.string().uuid(),
  statusId: z.string().uuid(),
  title: z.string().min(1).max(255),
  descriptionMd: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
});

export const UpdateTicketBody = z.object({
  statusId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255).optional(),
  descriptionMd: z.string().optional(),
});

export type ListTicketsQueryT = z.infer<typeof ListTicketsQuery>;
export type CreateTicketBodyT = z.infer<typeof CreateTicketBody>;
export type UpdateTicketBodyT = z.infer<typeof UpdateTicketBody>;
