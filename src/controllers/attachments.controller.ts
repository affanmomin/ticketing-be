import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import {
  listAttachments,
  getPresignedUrl,
  confirmAttachment,
  deleteAttachment,
} from '../services/attachments.service';
import {
  ListAttachmentsParams,
  PresignAttachmentBody,
  ConfirmAttachmentBody,
  AttachmentIdParams,
} from '../schemas/attachments.schema';
import { unauthorized } from '../utils/errors';

/**
 * GET /tickets/:id/attachments
 */
export async function listAttachmentsCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = ListAttachmentsParams.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attachments = await listAttachments(client, ticketId);

    await client.query('COMMIT');
    return reply.send(attachments);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * POST /tickets/:id/attachments/presign
 */
export async function presignAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = ListAttachmentsParams.parse(req.params);
  const body = PresignAttachmentBody.parse(req.body);

  const presign = await getPresignedUrl(ticketId, body.fileName, body.mimeType);
  return reply.send(presign);
}

/**
 * POST /tickets/:id/attachments/confirm
 */
export async function confirmAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = ListAttachmentsParams.parse(req.params);
  const body = ConfirmAttachmentBody.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attachment = await confirmAttachment(
      client,
      ticketId,
      req.user.userId,
      body.storageUrl,
      body.fileName,
      body.mimeType,
      body.fileSize
    );

    await client.query('COMMIT');
    return reply.code(201).send(attachment);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * DELETE /attachments/:id
 */
export async function deleteAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: attachmentId } = AttachmentIdParams.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await deleteAttachment(client, attachmentId);

    await client.query('COMMIT');
    return reply.status(204).send();
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
