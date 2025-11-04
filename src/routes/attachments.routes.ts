import { FastifyInstance } from 'fastify';
import {
  listAttachmentsCtrl,
  presignAttachmentCtrl,
  confirmAttachmentCtrl,
  deleteAttachmentCtrl,
} from '../controllers/attachments.controller';
import {
  ListAttachmentsParams,
  PresignAttachmentBody,
  ConfirmAttachmentBody,
  AttachmentIdParams,
} from '../schemas/attachments.schema';

export default async function attachmentsRoutes(app: FastifyInstance) {
  app.get('/tickets/:id/attachments', { schema: { params: ListAttachmentsParams } }, listAttachmentsCtrl);
  app.post('/tickets/:id/attachments/presign', { schema: { params: ListAttachmentsParams, body: PresignAttachmentBody } }, presignAttachmentCtrl);
  app.post('/tickets/:id/attachments/confirm', { schema: { params: ListAttachmentsParams, body: ConfirmAttachmentBody } }, confirmAttachmentCtrl);
  app.delete('/attachments/:id', { schema: { params: AttachmentIdParams } }, deleteAttachmentCtrl);
}
