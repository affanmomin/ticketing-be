import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';

export interface StreamResult {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listStreams(
  tx: PoolClient,
  projectId: string,
  organizationId: string,
  limit: number,
  offset: number
): Promise<{ data: StreamResult[]; total: number }> {
  const { rows: projectRows } = await tx.query(
    `SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw forbidden('Project not found');

  const { rows: countRows } = await tx.query(
    'SELECT COUNT(*)::int as total FROM stream WHERE project_id = $1',
    [projectId]
  );
  const total = countRows[0].total;

  const { rows } = await tx.query(
    `SELECT id, project_id, name, description, active, created_at, updated_at
     FROM stream WHERE project_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [projectId, limit, offset]
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

export async function getStream(
  tx: PoolClient,
  streamId: string,
  organizationId: string
): Promise<StreamResult> {
  const { rows } = await tx.query(
    `SELECT s.id, s.project_id, s.name, s.description, s.active, s.created_at, s.updated_at
     FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [streamId, organizationId]
  );
  if (rows.length === 0) throw notFound('Stream not found');
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createStream(
  tx: PoolClient,
  organizationId: string,
  projectId: string,
  name: string,
  description?: string | null
): Promise<StreamResult> {
  const { rows: projectRows } = await tx.query(
    `SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw forbidden('Project not found');

  const { rows: existing } = await tx.query(
    'SELECT id FROM stream WHERE project_id = $1 AND name = $2',
    [projectId, name]
  );
  if (existing.length > 0) throw badRequest('Stream with this name already exists');

  const { rows } = await tx.query(
    `INSERT INTO stream (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, project_id, name, description, active, created_at, updated_at`,
    [projectId, name, description || null]
  );
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function updateStream(
  tx: PoolClient,
  streamId: string,
  organizationId: string,
  updates: { name?: string; description?: string | null; active?: boolean }
): Promise<StreamResult> {
  const { rows: existing } = await tx.query(
    `SELECT s.id FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [streamId, organizationId]
  );
  if (existing.length === 0) throw notFound('Stream not found');

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

  params.push(streamId);
  const { rows } = await tx.query(
    `UPDATE stream SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, name, description, active, created_at, updated_at`,
    params
  );
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
