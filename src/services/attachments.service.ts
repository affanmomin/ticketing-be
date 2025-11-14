import { PoolClient } from 'pg';
import { notFound } from '../utils/errors';

export interface AttachmentResult {
  id: string;
  ticketId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string | null;
  createdAt: Date;
}

export interface AttachmentWithData extends AttachmentResult {
  fileData: Buffer;
}

export async function listAttachments(
  tx: PoolClient,
  ticketId: string
): Promise<AttachmentResult[]> {
  const { rows } = await tx.query(
    `SELECT id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at
     FROM ticket_attachment
     WHERE ticket_id = $1
     ORDER BY created_at DESC`,
    [ticketId]
  );

  return rows.map(r => ({
    id: r.id,
    ticketId: r.ticket_id,
    uploadedBy: r.uploaded_by,
    fileName: r.file_name,
    mimeType: r.mime_type,
    fileSize: r.file_size,
    storageUrl: r.storage_url,
    createdAt: r.created_at,
  }));
}

export async function uploadAttachment(
  tx: PoolClient,
  ticketId: string,
  uploadedByUserId: string,
  fileName: string,
  mimeType: string,
  fileData: Buffer
): Promise<AttachmentResult> {
  const fileSize = fileData.length;
  
  const { rows } = await tx.query(
    `INSERT INTO ticket_attachment (ticket_id, uploaded_by, file_name, mime_type, file_size, file_data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at`,
    [ticketId, uploadedByUserId, fileName, mimeType, fileSize, fileData]
  );

  const r = rows[0];
  return {
    id: r.id,
    ticketId: r.ticket_id,
    uploadedBy: r.uploaded_by,
    fileName: r.file_name,
    mimeType: r.mime_type,
    fileSize: r.file_size,
    storageUrl: r.storage_url,
    createdAt: r.created_at,
  };
}

export async function getAttachmentData(
  tx: PoolClient,
  attachmentId: string
): Promise<AttachmentWithData> {
  const { rows } = await tx.query(
    `SELECT id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, file_data, created_at
     FROM ticket_attachment
     WHERE id = $1`,
    [attachmentId]
  );

  if (rows.length === 0) throw notFound('Attachment not found');

  const r = rows[0];
  
  if (!r.file_data) {
    throw notFound('Attachment file data not found');
  }

  return {
    id: r.id,
    ticketId: r.ticket_id,
    uploadedBy: r.uploaded_by,
    fileName: r.file_name,
    mimeType: r.mime_type,
    fileSize: r.file_size,
    storageUrl: r.storage_url,
    fileData: r.file_data,
    createdAt: r.created_at,
  };
}

export async function deleteAttachment(
  tx: PoolClient,
  attachmentId: string
): Promise<void> {
  const { rows } = await tx.query(
    'DELETE FROM ticket_attachment WHERE id = $1 RETURNING id',
    [attachmentId]
  );

  if (rows.length === 0) throw notFound('Attachment not found');
  
  // File data is automatically deleted with the row (CASCADE handled by DB)
}
