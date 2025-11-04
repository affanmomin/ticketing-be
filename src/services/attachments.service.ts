import { PoolClient } from 'pg';
import { notFound } from '../utils/errors';

export interface AttachmentResult {
  id: string;
  ticketId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  createdAt: Date;
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

export async function getPresignedUrl(
  ticketId: string,
  fileName: string,
  mimeType: string
): Promise<{ uploadUrl: string; key: string }> {
  // TODO: Integrate with S3 or preferred storage provider
  const key = `${ticketId}/${Date.now()}_${fileName}`;

  return {
    uploadUrl: `https://example-storage/presign?key=${encodeURIComponent(key)}&type=${encodeURIComponent(mimeType)}`,
    key,
  };
}

export async function confirmAttachment(
  tx: PoolClient,
  ticketId: string,
  uploadedByUserId: string,
  storageUrl: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<AttachmentResult> {
  const { rows } = await tx.query(
    `INSERT INTO ticket_attachment (ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at`,
    [ticketId, uploadedByUserId, fileName, mimeType, fileSize, storageUrl]
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

export async function deleteAttachment(
  tx: PoolClient,
  attachmentId: string
): Promise<void> {
  const { rows } = await tx.query(
    'DELETE FROM ticket_attachment WHERE id = $1 RETURNING id, storage_url',
    [attachmentId]
  );

  if (rows.length === 0) throw notFound('Attachment not found');

  // TODO: Delete from storage provider using rows[0].storage_url
}
