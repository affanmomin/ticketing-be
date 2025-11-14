import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import {
  listAttachments,
  uploadAttachment,
  getAttachmentData,
  deleteAttachment,
} from '../services/attachments.service';
import {
  ListAttachmentsParams,
  AttachmentIdParams,
} from '../schemas/attachments.schema';
import { unauthorized, badRequest } from '../utils/errors';

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
 * POST /tickets/:id/attachments
 * Upload a file attachment directly to the database
 */
export async function uploadAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: ticketId } = ListAttachmentsParams.parse(req.params);

  const data = await req.file();
  if (!data) {
    throw badRequest('No file provided');
  }

  const fileData = await data.toBuffer();
  const fileName = data.filename || 'unnamed';
  const mimeType = data.mimetype || 'application/octet-stream';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attachment = await uploadAttachment(
      client,
      ticketId,
      req.user.userId,
      fileName,
      mimeType,
      fileData
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
 * GET /attachments/:id/download
 * Download an attachment file
 */
export async function downloadAttachmentCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw unauthorized('Authentication required');

  const { id: attachmentId } = AttachmentIdParams.parse(req.params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attachment = await getAttachmentData(client, attachmentId);

    await client.query('COMMIT');

    reply.header('Content-Type', attachment.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    reply.header('Content-Length', attachment.fileSize.toString());
    return reply.send(attachment.fileData);
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
