import { FastifyInstance } from 'fastify';
import {
  listAttachmentsCtrl,
  uploadAttachmentCtrl,
  downloadAttachmentCtrl,
  deleteAttachmentCtrl,
} from '../controllers/attachments.controller';
import {
  ListAttachmentsParams,
  AttachmentIdParams,
} from '../schemas/attachments.schema';

export default async function attachmentsRoutes(app: FastifyInstance) {
  app.get('/tickets/:id/attachments', { schema: { params: ListAttachmentsParams } }, listAttachmentsCtrl);
  app.post('/tickets/:id/attachments', { schema: { params: ListAttachmentsParams } }, uploadAttachmentCtrl);
  app.get('/attachments/:id/download', { schema: { params: AttachmentIdParams } }, downloadAttachmentCtrl);
  app.delete('/attachments/:id', { schema: { params: AttachmentIdParams } }, deleteAttachmentCtrl);
}
