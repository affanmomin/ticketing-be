import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { badRequest, notFound, forbidden } from '../utils/errors';
import { Role } from '../types/common';

export interface ListUsersFilter {
  userType?: Role;
  search?: string;
  isActive?: boolean;
}

export interface ListUsersResult {
  id: string;
  organizationId: string;
  clientId: string | null;
  userType: Role;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List users within an organization (ADMIN/EMPLOYEE only)
 * For ADMIN: lists all internal users (ADMIN + EMPLOYEE) and CLIENT users
 * For EMPLOYEE: lists other EMPLOYEEs and CLIENTs in same org
 */
export async function listUsers(
  tx: PoolClient,
  organizationId: string,
  filter: ListUsersFilter,
  limit: number,
  offset: number
): Promise<{ data: ListUsersResult[]; total: number }> {
  const conditions: string[] = ['au.organization_id = $1'];
  const params: any[] = [organizationId];
  let paramIndex = 2;

  if (filter.userType) {
    conditions.push(`au.user_type = $${paramIndex}`);
    params.push(filter.userType);
    paramIndex++;
  }

  if (filter.isActive !== undefined) {
    conditions.push(`au.is_active = $${paramIndex}`);
    params.push(filter.isActive);
    paramIndex++;
  }

  if (filter.search) {
    conditions.push(`(LOWER(au.full_name) LIKE $${paramIndex} OR LOWER(au.email) LIKE $${paramIndex})`);
    params.push(`%${filter.search.toLowerCase()}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const { rows: countRows } = await tx.query(
    `SELECT COUNT(*)::int as total FROM app_user au WHERE ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // Get paginated results
  params.push(limit, offset);
  const { rows } = await tx.query(
    `SELECT
      id, organization_id, client_id, user_type, email, full_name,
      is_active, created_at, updated_at
     FROM app_user
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    data: rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      userType: r.user_type,
      email: r.email,
      fullName: r.full_name,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

/**
 * Get single user by ID
 */
export async function getUserById(
  tx: PoolClient,
  userId: string,
  organizationId: string
): Promise<ListUsersResult> {
  const { rows } = await tx.query(
    `SELECT id, organization_id, client_id, user_type, email, full_name,
            is_active, created_at, updated_at
     FROM app_user WHERE id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );

  if (rows.length === 0) throw notFound('User not found');

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    clientId: r.client_id,
    userType: r.user_type,
    email: r.email,
    fullName: r.full_name,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Create EMPLOYEE user (ADMIN only)
 */
export async function createEmployee(
  tx: PoolClient,
  organizationId: string,
  email: string,
  fullName: string,
  password: string
): Promise<ListUsersResult> {
  // Check email uniqueness
  const { rows: existing } = await tx.query(
    'SELECT id FROM app_user WHERE email = $1',
    [email]
  );
  if (existing.length > 0) throw badRequest('Email already in use');

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await tx.query(
    `INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, NULL, 'EMPLOYEE', $2, $3, $4, true)
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`,
    [organizationId, email, fullName, passwordHash]
  );

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    clientId: r.client_id,
    userType: r.user_type,
    email: r.email,
    fullName: r.full_name,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Create CLIENT user (ADMIN only, requires valid client)
 */
export async function createClientUser(
  tx: PoolClient,
  organizationId: string,
  clientId: string,
  email: string,
  fullName: string,
  password: string
): Promise<ListUsersResult> {
  // Verify client belongs to organization
  const { rows: clientRows } = await tx.query(
    'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
    [clientId, organizationId]
  );
  if (clientRows.length === 0) throw forbidden('Client does not belong to organization');

  // Check email uniqueness
  const { rows: existing } = await tx.query(
    'SELECT id FROM app_user WHERE email = $1',
    [email]
  );
  if (existing.length > 0) throw badRequest('Email already in use');

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await tx.query(
    `INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, $2, 'CLIENT', $3, $4, $5, true)
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`,
    [organizationId, clientId, email, fullName, passwordHash]
  );

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    clientId: r.client_id,
    userType: r.user_type,
    email: r.email,
    fullName: r.full_name,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Update user (name, email, active status)
 * Cannot change role via this function
 */
export async function updateUser(
  tx: PoolClient,
  userId: string,
  organizationId: string,
  updates: { fullName?: string; email?: string; isActive?: boolean }
): Promise<ListUsersResult> {
  const { rows: existing } = await tx.query(
    'SELECT id FROM app_user WHERE id = $1 AND organization_id = $2',
    [userId, organizationId]
  );
  if (existing.length === 0) throw notFound('User not found');

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.fullName !== undefined) {
    updateFields.push(`full_name = $${paramIndex}`);
    params.push(updates.fullName);
    paramIndex++;
  }

  if (updates.email !== undefined) {
    // Check email uniqueness (excluding current user)
    const { rows: emailCheck } = await tx.query(
      'SELECT id FROM app_user WHERE email = $1 AND id != $2',
      [updates.email, userId]
    );
    if (emailCheck.length > 0) throw badRequest('Email already in use');
    updateFields.push(`email = $${paramIndex}`);
    params.push(updates.email);
    paramIndex++;
  }

  if (updates.isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex}`);
    params.push(updates.isActive);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(userId);
  const { rows } = await tx.query(
    `UPDATE app_user SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`,
    params
  );

  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organization_id,
    clientId: r.client_id,
    userType: r.user_type,
    email: r.email,
    fullName: r.full_name,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Change password (user calls this for themselves)
 */
export async function changePassword(
  tx: PoolClient,
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { rows } = await tx.query(
    'UPDATE app_user SET password_hash = $1 WHERE id = $2',
    [passwordHash, userId]
  );
  if (rows.length === 0) throw notFound('User not found');
}
