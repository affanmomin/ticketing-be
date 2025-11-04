import { z } from 'zod';

export const PriorityResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  rank: z.number().int(),
  colorHex: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const StatusResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isClosed: z.boolean(),
  sequence: z.number().int(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PriorityResponseT = z.infer<typeof PriorityResponse>;
export type StatusResponseT = z.infer<typeof StatusResponse>;
