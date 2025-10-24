import { z } from 'zod';

export const UploadAttachmentBody = z.object({ ticketId: z.string().uuid() });
export type UploadAttachmentBodyT = z.infer<typeof UploadAttachmentBody>;
