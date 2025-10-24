import { FastifyInstance } from 'fastify';
import { listAttachmentsCtrl, uploadAttachmentCtrl, deleteAttachmentCtrl } from '../controllers/attachments.controller';

export default async function attachmentsRoutes(app: FastifyInstance) {
  app.get('/tickets/:id/attachments', listAttachmentsCtrl);
  app.post('/attachments', uploadAttachmentCtrl);
  app.delete('/attachments/:id', deleteAttachmentCtrl);
}
