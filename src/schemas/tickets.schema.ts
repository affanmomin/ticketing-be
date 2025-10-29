import { z } from 'zod';

const Status = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']);
const Priority = z.enum(['P0', 'P1', 'P2', 'P3']);
const Type = z.enum(['TASK', 'BUG', 'STORY', 'EPIC']);

export const TicketFilterQuery = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  streamId: z.string().uuid().optional(),
  status: z.array(Status).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreateTicketBody = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  streamId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  descriptionMd: z.string().min(1),
  priority: Priority.default('P2'),
  type: Type.default('TASK'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  points: z.coerce.number().int().min(0).max(100).optional(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export const UpdateTicketBody = CreateTicketBody.partial().and(
  z.object({ id: z.string(), status: Status.optional() }),
);

export type TicketFilterQueryT = z.infer<typeof TicketFilterQuery>;
export type CreateTicketBodyT = z.infer<typeof CreateTicketBody>;
export type UpdateTicketBodyT = z.infer<typeof UpdateTicketBody>;
