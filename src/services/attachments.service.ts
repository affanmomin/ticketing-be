import { PoolClient } from 'pg';
import { notFound } from '../utils/errors';
import { uploadBuffer, deleteObject, signedGetUrl } from '../utils/s3';

export async function listAttachments(tx: PoolClient, ticketId: string) {
  const { rows } = await tx.query(`select * from "Attachment" where "ticketId"=$1 order by "createdAt" desc`, [ticketId]);
  const enriched = await Promise.all(
    rows.map(async (r) => ({ ...r, url: await signedGetUrl(r.s3Key, 3600) })),
  );
  return enriched;
}

export async function uploadAttachment(
  tx: PoolClient,
  args: { ticketId: string; userId: string; file: { filename: string; mimetype: string; buffer: Buffer; size: number } },
) {
  const { rows: t } = await tx.query(`select id,"tenantId","clientId" from "Ticket" where id=$1`, [args.ticketId]);
  if (!t[0]) throw notFound('Ticket not found');
  const key = `${t[0].tenantId}/${t[0].clientId}/tickets/${t[0].id}/${Date.now()}_${args.file.filename}`;
  await uploadBuffer(key, args.file.buffer, args.file.mimetype);
  const { rows } = await tx.query(
    `
    insert into "Attachment" (id,"tenantId","ticketId","uploaderId",filename,mime,size,"s3Key")
    values (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7) returning *
  `,
    [t[0].tenantId, args.ticketId, args.userId, args.file.filename, args.file.mimetype, args.file.size, key],
  );
  return rows[0];
}

export async function deleteAttachment(tx: PoolClient, id: string) {
  const { rows } = await tx.query(`delete from "Attachment" where id=$1 returning *`, [id]);
  if (!rows[0]) throw notFound('Attachment not found');
  await deleteObject(rows[0].s3Key);
  return { ok: true };
}
