import { z } from 'zod';

export const ListAttachmentsParams = z.object({
  id: z.string().uuid(),
});

export const PresignAttachmentBody = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
});

export const ConfirmAttachmentBody = z.object({
  storageUrl: z.string().url(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  fileSize: z.coerce.number().int().min(0),
});

export const AttachmentIdParams = z.object({
  id: z.string().uuid(),
});

export type PresignAttachmentBodyT = z.infer<typeof PresignAttachmentBody>;
export type ConfirmAttachmentBodyT = z.infer<typeof ConfirmAttachmentBody>;
