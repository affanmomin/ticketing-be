import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { CreateUserBodyT, UpdateUserBodyT, ListUsersQueryT } from '../schemas/users.schema';
import { badRequest, notFound } from '../utils/errors';

/**
 * List assignable users for a specific client (original function)
 */
export async function listAssignableUsers(tx: PoolClient, clientId: string) {
  const { rows } = await tx.query(
    `
    SELECT u.id, u.name, u.email
    FROM "user" u
    WHERE u.client_company_id = $1 AND u.active = true
    ORDER BY u.name ASC
  `,
    [clientId],
  );
  return rows;
}

/**
 * Create a new user (admin creates employee users)
 */
export async function createUser(tx: PoolClient, body: CreateUserBodyT, tenantId: string) {
  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 10);

  // Insert user with tenant_id and optional client_company_id
  const { rows } = await tx.query(
    `INSERT INTO "user" (email, name, password_hash, user_type, tenant_id, client_company_id, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, name, user_type as "userType", tenant_id as "tenantId", 
               client_company_id as "clientCompanyId", active, 
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      body.email.toLowerCase(),
      body.name,
      passwordHash,
      body.userType || 'EMPLOYEE',
      tenantId,
      body.clientCompanyId || null,
      body.active ?? true,
    ],
  );

  return rows[0];
}

/**
 * List users with filtering and pagination
 */
export async function listUsers(tx: PoolClient, query: ListUsersQueryT, tenantId: string) {
  const conditions: string[] = ['u.tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Filter by user type
  if (query.userType) {
    conditions.push(`u.user_type = $${paramIndex}`);
    params.push(query.userType);
    paramIndex++;
  }

  // Filter by client company
  if (query.clientCompanyId) {
    conditions.push(`u.client_company_id = $${paramIndex}`);
    params.push(query.clientCompanyId);
    paramIndex++;
  }

  // Filter by active status
  if (query.active !== undefined) {
    conditions.push(`u.active = $${paramIndex}`);
    params.push(query.active);
    paramIndex++;
  }

  // Search by name or email
  if (query.search) {
    conditions.push(`(LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`);
    params.push(`%${query.search.toLowerCase()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM "user" u
    ${whereClause}
  `;
  const { rows: countRows } = await tx.query(countQuery, params);
  const total = countRows[0].total;

  // Get paginated results
  params.push(query.limit, query.offset);
  const dataQuery = `
    SELECT 
      u.id,
      u.email,
      u.name,
      u.user_type as "userType",
      u.tenant_id as "tenantId",
      u.client_company_id as "clientCompanyId",
      cc.name as "clientCompanyName",
      u.active,
      u.last_sign_in_at as "lastSignInAt",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    FROM "user" u
    LEFT JOIN client_company cc ON cc.id = u.client_company_id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const { rows } = await tx.query(dataQuery, params);

  return {
    data: rows,
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * Get a single user by ID
 */
export async function getUser(tx: PoolClient, userId: string, tenantId: string) {
  const { rows } = await tx.query(
    `
    SELECT 
      u.id,
      u.email,
      u.name,
      u.user_type as "userType",
      u.tenant_id as "tenantId",
      u.client_company_id as "clientCompanyId",
      cc.name as "clientCompanyName",
      u.active,
      u.last_sign_in_at as "lastSignInAt",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    FROM "user" u
    LEFT JOIN client_company cc ON cc.id = u.client_company_id
    WHERE u.id = $1 AND u.tenant_id = $2
    `,
    [userId, tenantId],
  );

  if (rows.length === 0) {
    throw notFound('User not found');
  }

  return rows[0];
}

/**
 * Update user details
 */
export async function updateUser(tx: PoolClient, userId: string, body: UpdateUserBodyT, tenantId: string) {
  // Verify user exists in tenant
  const { rows: existingRows } = await tx.query(
    `SELECT id FROM "user" WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  );

  if (existingRows.length === 0) {
    throw notFound('User not found');
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (body.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(body.name);
    paramIndex++;
  }

  if (body.email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    params.push(body.email.toLowerCase());
    paramIndex++;
  }

  if (body.password !== undefined) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    updates.push(`password_hash = $${paramIndex}`);
    params.push(passwordHash);
    paramIndex++;
  }

  if (body.userType !== undefined) {
    updates.push(`user_type = $${paramIndex}`);
    params.push(body.userType);
    paramIndex++;
  }

  if (body.clientCompanyId !== undefined) {
    updates.push(`client_company_id = $${paramIndex}`);
    params.push(body.clientCompanyId);
    paramIndex++;
  }

  if (body.active !== undefined) {
    updates.push(`active = $${paramIndex}`);
    params.push(body.active);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw badRequest('No fields to update');
  }

  params.push(userId);
  const { rows } = await tx.query(
    `UPDATE "user"
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, name, user_type as "userType", tenant_id as "tenantId",
               client_company_id as "clientCompanyId", active, 
               created_at as "createdAt", updated_at as "updatedAt"`,
    params,
  );

  return rows[0];
}

/**
 * Delete user (soft delete by setting active = false, or hard delete)
 */
export async function deleteUser(tx: PoolClient, userId: string, tenantId: string, hard = false) {
  // Verify user exists in tenant
  const { rows: existingRows } = await tx.query(
    `SELECT id FROM "user" WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  );

  if (existingRows.length === 0) {
    throw notFound('User not found');
  }

  if (hard) {
    // Hard delete - permanently remove user
    await tx.query(`DELETE FROM "user" WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
    return { deleted: true, hard: true };
  } else {
    // Soft delete - set active = false
    await tx.query(`UPDATE "user" SET active = false WHERE id = $1`, [userId]);
    return { deleted: true, hard: false };
  }
}

/**
 * Create a new user (admin creates employee or client users)
 */
export async function createUser(tx: PoolClient, body: CreateUserBodyT, tenantId: string) {
  // Validate CLIENT type users must have a clientId
  if (body.userType === 'CLIENT' && !body.clientId) {
    throw badRequest('CLIENT type users must have a clientId');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 10);

  // Insert user
  const { rows } = await tx.query(
    `INSERT INTO "user" (email, name, password_hash, user_type, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, user_type as "userType", active, created_at as "createdAt", updated_at as "updatedAt"`,
    [body.email.toLowerCase(), body.name, passwordHash, body.userType, body.active],
  );
  const user = rows[0];

  // Create tenant membership (using tenant_role MEMBER by default for employees/clients)
  const tenantRole = body.userType === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  await tx.query(
    `INSERT INTO tenant_membership (tenant_id, user_id, role, client_id)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, user.id, tenantRole, body.clientId || null],
  );

  // If CLIENT type, also create user_client_map
  if (body.userType === 'CLIENT' && body.clientId) {
    await tx.query(
      `INSERT INTO user_client_map (tenant_id, user_id, client_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id, client_id) DO NOTHING`,
      [tenantId, user.id, body.clientId],
    );
  }

  return user;
}

/**
 * List users with filtering and pagination
 */
export async function listUsers(tx: PoolClient, query: ListUsersQueryT, tenantId: string) {
  const conditions: string[] = ['tm.tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Filter by user type
  if (query.userType) {
    conditions.push(`u.user_type = $${paramIndex}`);
    params.push(query.userType);
    paramIndex++;
  }

  // Filter by client (if provided)
  if (query.clientId) {
    conditions.push(`tm.client_id = $${paramIndex}`);
    params.push(query.clientId);
    paramIndex++;
  }

  // Filter by active status
  if (query.active !== undefined) {
    conditions.push(`u.active = $${paramIndex}`);
    params.push(query.active);
    paramIndex++;
  }

  // Search by name or email
  if (query.search) {
    conditions.push(`(LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`);
    params.push(`%${query.search.toLowerCase()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT u.id)::int as total
    FROM "user" u
    JOIN tenant_membership tm ON tm.user_id = u.id
    ${whereClause}
  `;
  const { rows: countRows } = await tx.query(countQuery, params);
  const total = countRows[0].total;

  // Get paginated results
  params.push(query.limit, query.offset);
  const dataQuery = `
    SELECT 
      u.id,
      u.email,
      u.name,
      u.user_type as "userType",
      u.active,
      tm.client_id as "clientId",
      cc.name as "clientName",
      u.last_sign_in_at as "lastSignInAt",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    FROM "user" u
    JOIN tenant_membership tm ON tm.user_id = u.id
    LEFT JOIN client_company cc ON cc.id = tm.client_id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const { rows } = await tx.query(dataQuery, params);

  return {
    data: rows,
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * Get a single user by ID
 */
export async function getUser(tx: PoolClient, userId: string, tenantId: string) {
  const { rows } = await tx.query(
    `
    SELECT 
      u.id,
      u.email,
      u.name,
      u.user_type as "userType",
      u.active,
      tm.client_id as "clientId",
      cc.name as "clientName",
      tm.role as "tenantRole",
      u.last_sign_in_at as "lastSignInAt",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    FROM "user" u
    JOIN tenant_membership tm ON tm.user_id = u.id AND tm.tenant_id = $2
    LEFT JOIN client_company cc ON cc.id = tm.client_id
    WHERE u.id = $1
    `,
    [userId, tenantId],
  );

  if (rows.length === 0) {
    throw notFound('User not found');
  }

  return rows[0];
}

/**
 * Update user details
 */
export async function updateUser(tx: PoolClient, userId: string, body: UpdateUserBodyT, tenantId: string) {
  // Verify user exists in tenant
  const { rows: existingRows } = await tx.query(
    `SELECT u.id FROM "user" u
     JOIN tenant_membership tm ON tm.user_id = u.id
     WHERE u.id = $1 AND tm.tenant_id = $2`,
    [userId, tenantId],
  );

  if (existingRows.length === 0) {
    throw notFound('User not found');
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (body.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(body.name);
    paramIndex++;
  }

  if (body.email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    params.push(body.email.toLowerCase());
    paramIndex++;
  }

  if (body.password !== undefined) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    updates.push(`password_hash = $${paramIndex}`);
    params.push(passwordHash);
    paramIndex++;
  }

  if (body.userType !== undefined) {
    updates.push(`user_type = $${paramIndex}`);
    params.push(body.userType);
    paramIndex++;
  }

  if (body.active !== undefined) {
    updates.push(`active = $${paramIndex}`);
    params.push(body.active);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw badRequest('No fields to update');
  }

  params.push(userId);
  const { rows } = await tx.query(
    `UPDATE "user"
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, name, user_type as "userType", active, created_at as "createdAt", updated_at as "updatedAt"`,
    params,
  );

  // Update tenant_membership if clientId is provided
  if (body.clientId !== undefined) {
    await tx.query(
      `UPDATE tenant_membership
       SET client_id = $1
       WHERE user_id = $2 AND tenant_id = $3`,
      [body.clientId, userId, tenantId],
    );

    // If changing to CLIENT type and clientId provided, ensure user_client_map exists
    if (body.userType === 'CLIENT' && body.clientId) {
      await tx.query(
        `INSERT INTO user_client_map (tenant_id, user_id, client_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, user_id, client_id) DO NOTHING`,
        [tenantId, userId, body.clientId],
      );
    }
  }

  return rows[0];
}

/**
 * Delete user (soft delete by setting active = false, or hard delete)
 */
export async function deleteUser(tx: PoolClient, userId: string, tenantId: string, hard = false) {
  // Verify user exists in tenant
  const { rows: existingRows } = await tx.query(
    `SELECT u.id FROM "user" u
     JOIN tenant_membership tm ON tm.user_id = u.id
     WHERE u.id = $1 AND tm.tenant_id = $2`,
    [userId, tenantId],
  );

  if (existingRows.length === 0) {
    throw notFound('User not found');
  }

  if (hard) {
    // Hard delete - remove tenant membership (cascades will handle user_client_map)
    await tx.query(`DELETE FROM tenant_membership WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    // Note: We don't delete the user from "user" table as they might belong to other tenants
    return { deleted: true, hard: true };
  } else {
    // Soft delete - set active = false
    await tx.query(`UPDATE "user" SET active = false WHERE id = $1`, [userId]);
    return { deleted: true, hard: false };
  }
}
