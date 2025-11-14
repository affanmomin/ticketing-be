import { z } from 'zod';

export const ListAttachmentsParams = z.object({
  id: z.string().uuid(),
});

export const AttachmentIdParams = z.object({
  id: z.string().uuid(),
});
