import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';

export interface StreamResult {
  id: string;
  projectId: string;
  parentStreamId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: StreamResult[]; // Optional: for hierarchical responses
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
    'SELECT COUNT(*)::int as total FROM stream WHERE project_id = $1 AND active = true',
    [projectId]
  );
  const total = countRows[0].total;

  const { rows } = await tx.query(
    `SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream WHERE project_id = $1 AND active = true
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [projectId, limit, offset]
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      parentStreamId: r.parent_stream_id,
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
    `SELECT s.id, s.project_id, s.parent_stream_id, s.name, s.description, s.active, s.created_at, s.updated_at
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
    parentStreamId: r.parent_stream_id,
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
  description?: string | null,
  parentStreamId?: string | null
): Promise<StreamResult> {
  const { rows: projectRows } = await tx.query(
    `SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw forbidden('Project not found');

  // If parent_stream_id provided, verify it exists and belongs to same project
  if (parentStreamId) {
    const { rows: parentRows } = await tx.query(
      'SELECT id FROM stream WHERE id = $1 AND project_id = $2',
      [parentStreamId, projectId]
    );
    if (parentRows.length === 0) throw badRequest('Parent stream not found or does not belong to this project');
  }

  const { rows: existing } = await tx.query(
    'SELECT id FROM stream WHERE project_id = $1 AND name = $2',
    [projectId, name]
  );
  if (existing.length > 0) throw badRequest('Stream with this name already exists');

  const { rows } = await tx.query(
    `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, project_id, parent_stream_id, name, description, active, created_at, updated_at`,
    [projectId, parentStreamId || null, name, description || null]
  );
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    parentStreamId: r.parent_stream_id,
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
  updates: { name?: string; description?: string | null; active?: boolean; parentStreamId?: string | null }
): Promise<StreamResult> {
  const { rows: existing } = await tx.query(
    `SELECT s.id, s.project_id FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [streamId, organizationId]
  );
  if (existing.length === 0) throw notFound('Stream not found');

  const projectId = existing[0].project_id;

  // If parent_stream_id is being updated, verify it exists and prevent circular reference
  if (updates.parentStreamId !== undefined && updates.parentStreamId !== null) {
    if (updates.parentStreamId === streamId) {
      throw badRequest('A stream cannot be its own parent');
    }
    const { rows: parentRows } = await tx.query(
      'SELECT id FROM stream WHERE id = $1 AND project_id = $2',
      [updates.parentStreamId, projectId]
    );
    if (parentRows.length === 0) throw badRequest('Parent stream not found or does not belong to this project');
  }

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

  if (updates.parentStreamId !== undefined) {
    updateFields.push(`parent_stream_id = $${paramIndex}`);
    params.push(updates.parentStreamId);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(streamId);
  const { rows } = await tx.query(
    `UPDATE stream SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, parent_stream_id, name, description, active, created_at, updated_at`,
    params
  );
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    parentStreamId: r.parent_stream_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Get all parent streams (streams with no parent) for a project
 * This is for populating the first dropdown
 */
export async function listParentStreams(
  tx: PoolClient,
  projectId: string,
  organizationId: string
): Promise<StreamResult[]> {
  const { rows: projectRows } = await tx.query(
    `SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw forbidden('Project not found');

  const { rows } = await tx.query(
    `SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream
     WHERE project_id = $1 AND parent_stream_id IS NULL AND active = true
     ORDER BY name ASC`,
    [projectId]
  );

  return rows.map(r => ({
    id: r.id,
    projectId: r.project_id,
    parentStreamId: r.parent_stream_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Get all child streams for a specific parent stream
 * This is for populating the second dropdown when a parent is selected
 */
export async function listChildStreams(
  tx: PoolClient,
  parentStreamId: string,
  organizationId: string
): Promise<StreamResult[]> {
  // Verify parent stream exists and user has access
  const { rows: parentRows } = await tx.query(
    `SELECT s.id, s.project_id FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`,
    [parentStreamId, organizationId]
  );
  if (parentRows.length === 0) throw notFound('Parent stream not found');

  const { rows } = await tx.query(
    `SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream
     WHERE parent_stream_id = $1 AND active = true
     ORDER BY name ASC`,
    [parentStreamId]
  );

  return rows.map(r => ({
    id: r.id,
    projectId: r.project_id,
    parentStreamId: r.parent_stream_id,
    name: r.name,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
