import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { listAttachments, uploadAttachment, deleteAttachment } from '../services/attachments.service';

export async function listAttachmentsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const ticketId = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await listAttachments(tx, ticketId)));
}

export async function uploadAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  const mp = await (req as any).file();
  if (!mp) throw new Error('No file');
  const ticketId = ((req.body as any)?.ticketId) || ((req.query as any)?.ticketId);
  const buffer = await mp.toBuffer();
  return withRlsTx(req, async (tx) => {
    const data = await uploadAttachment(tx, {
      ticketId,
      userId: req.auth!.userId,
      file: { filename: mp.filename, mimetype: mp.mimetype, buffer, size: buffer.length },
    });
    return reply.code(201).send(data);
  });
}

export async function deleteAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await deleteAttachment(tx, id)));
}
