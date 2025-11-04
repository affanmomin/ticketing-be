import { PoolClient } from 'pg';
import { badRequest, notFound } from '../utils/errors';

export interface ClientResult {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List all clients in an organization
 */
export async function listClients(
  tx: PoolClient,
  organizationId: string,
  limit: number,
  offset: number
): Promise<{ data: ClientResult[]; total: number }> {
  // Get total count
  const { rows: countRows } = await tx.query(
    'SELECT COUNT(*)::int as total FROM client WHERE organization_id = $1',
    [organizationId]
  );
  const total = countRows[0].total;

  // Get paginated results
  const { rows } = await tx.query(
    `SELECT id, organization_id, name, email, phone, address, active, created_at, updated_at
     FROM client WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [organizationId, limit, offset]
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

/**
 * Get single client by ID (scoped to organization)
 */
export async function getClient(
  tx: PoolClient,
  clientId: string,
  organizationId: string
): Promise<ClientResult> {
  const { rows } = await tx.query(
    `SELECT id, organization_id, name, email, phone, address, active, created_at, updated_at
     FROM client WHERE id = $1 AND organization_id = $2`,
    [clientId, organizationId]
  );

  if (rows.length === 0) throw notFound('Client not found');

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Create a new client
 */
export async function createClient(
  tx: PoolClient,
  organizationId: string,
  name: string,
  email?: string | null,
  phone?: string | null,
  address?: string | null
): Promise<ClientResult> {
  // Check unique constraint (organization_id, name)
  const { rows: existing } = await tx.query(
    'SELECT id FROM client WHERE organization_id = $1 AND name = $2',
    [organizationId, name]
  );
  if (existing.length > 0) throw badRequest('Client with this name already exists in organization');

  const { rows } = await tx.query(
    `INSERT INTO client (organization_id, name, email, phone, address, active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, organization_id, name, email, phone, address, active, created_at, updated_at`,
    [organizationId, name, email || null, phone || null, address || null]
  );

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Update a client
 */
export async function updateClient(
  tx: PoolClient,
  clientId: string,
  organizationId: string,
  updates: { name?: string; email?: string | null; phone?: string | null; address?: string | null; active?: boolean }
): Promise<ClientResult> {
  // Verify client exists in organization
  const { rows: existing } = await tx.query(
    'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
    [clientId, organizationId]
  );
  if (existing.length === 0) throw notFound('Client not found');

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    params.push(updates.name);
    paramIndex++;
  }

  if (updates.email !== undefined) {
    updateFields.push(`email = $${paramIndex}`);
    params.push(updates.email);
    paramIndex++;
  }

  if (updates.phone !== undefined) {
    updateFields.push(`phone = $${paramIndex}`);
    params.push(updates.phone);
    paramIndex++;
  }

  if (updates.address !== undefined) {
    updateFields.push(`address = $${paramIndex}`);
    params.push(updates.address);
    paramIndex++;
  }

  if (updates.active !== undefined) {
    updateFields.push(`active = $${paramIndex}`);
    params.push(updates.active);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(clientId);
  const { rows } = await tx.query(
    `UPDATE client SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, organization_id, name, email, phone, address, active, created_at, updated_at`,
    params
  );

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
