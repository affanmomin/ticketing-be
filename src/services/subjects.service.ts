import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';

export interface SubjectResult {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listSubjects(
  tx: PoolClient,
  clientId: string,
  organizationId: string,
  limit: number,
  offset: number
): Promise<{ data: SubjectResult[]; total: number }> {
  const { rows: clientRows } = await tx.query(
    'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
    [clientId, organizationId]
  );
  if (clientRows.length === 0) throw forbidden('Client not found');

  const { rows: countRows } = await tx.query(
    'SELECT COUNT(*)::int as total FROM subject WHERE client_id = $1',
    [clientId]
  );
  const total = countRows[0].total;

  const { rows } = await tx.query(
    `SELECT id, client_id, name, description, active, created_at, updated_at
     FROM subject WHERE client_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [clientId, limit, offset]
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      clientId: r.client_id,
      name: r.name,
      description: r.description,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

export async function getSubject(
  tx: PoolClient,
  subjectId: string,
  organizationId: string
): Promise<SubjectResult> {
  const { rows } = await tx.query(
    `SELECT s.id, s.client_id, s.name, s.description, s.active, s.created_at, s.updated_at
     FROM subject s
     JOIN client c ON c.id = s.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [subjectId, organizationId]
  );
  if (rows.length === 0) throw notFound('Subject not found');
  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createSubject(
  tx: PoolClient,
  organizationId: string,
  clientId: string,
  name: string,
  description?: string | null
): Promise<SubjectResult> {
  const { rows: clientRows } = await tx.query(
    'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
    [clientId, organizationId]
  );
  if (clientRows.length === 0) throw forbidden('Client not found');

  const { rows: existing } = await tx.query(
    'SELECT id FROM subject WHERE client_id = $1 AND name = $2',
    [clientId, name]
  );
  if (existing.length > 0) throw badRequest('Subject with this name already exists');

  const { rows } = await tx.query(
    `INSERT INTO subject (client_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, client_id, name, description, active, created_at, updated_at`,
    [clientId, name, description || null]
  );
  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function updateSubject(
  tx: PoolClient,
  subjectId: string,
  organizationId: string,
  updates: { name?: string; description?: string | null; active?: boolean }
): Promise<SubjectResult> {
  const { rows: existing } = await tx.query(
    `SELECT s.id FROM subject s
     JOIN client c ON c.id = s.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [subjectId, organizationId]
  );
  if (existing.length === 0) throw notFound('Subject not found');

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    params.push(updates.name);
    paramIndex++;
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex}`);
    params.push(updates.description);
    paramIndex++;
  }

  if (updates.active !== undefined) {
    updateFields.push(`active = $${paramIndex}`);
    params.push(updates.active);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(subjectId);
  const { rows } = await tx.query(
    `UPDATE subject SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, client_id, name, description, active, created_at, updated_at`,
    params
  );
  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
