import { PoolClient } from 'pg';
import { badRequest, notFound, forbidden } from '../utils/errors';
import { Role } from '../types/common';

export interface ProjectResult {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberResult {
  projectId: string;
  userId: string;
  role: 'MEMBER' | 'MANAGER' | 'VIEWER';
  canRaise: boolean;
  canBeAssigned: boolean;
  createdAt: Date;
}

export interface ListProjectsOptions {
  organizationId: string;
  userId: string;
  role: Role;
  clientId: string | null;
  filters?: {
    clientId?: string;
  };
  pagination: {
    limit: number;
    offset: number;
  };
}

/**
 * List projects scoped by user role and organization
 */
export async function listProjects(
  tx: PoolClient,
  options: ListProjectsOptions
): Promise<{ data: ProjectResult[]; total: number }> {
  const { organizationId, userId, role, clientId, filters, pagination } = options;

  const conditions: string[] = [];
  const params: any[] = [];

  // ADMIN: all projects in organization
  if (role === 'ADMIN') {
    params.push(organizationId);
    conditions.push(`c.organization_id = $${params.length}`);
  } else if (role === 'EMPLOYEE') {
    // EMPLOYEE: projects they're members of
    params.push(organizationId);
    const orgIdx = params.length;
    params.push(userId);
    const userIdx = params.length;
    conditions.push(`c.organization_id = $${orgIdx} AND EXISTS (
      SELECT 1 FROM project_member pm
      WHERE pm.project_id = p.id AND pm.user_id = $${userIdx}
    )`);
  } else if (role === 'CLIENT') {
    // CLIENT: projects for their client
    params.push(clientId);
    conditions.push(`p.client_id = $${params.length}`);
  }

  if (filters?.clientId) {
    params.push(filters.clientId);
    conditions.push(`p.client_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*)::int as total
    FROM project p
    JOIN client c ON c.id = p.client_id
    ${whereClause}
  `;
  const { rows: countRows } = await tx.query(countSql, params);
  const total = countRows[0].total;

  const dataParams = [...params, pagination.limit, pagination.offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const dataSql = `
    SELECT p.id, p.client_id, p.name, p.description, p.start_date, p.end_date,
           p.active, p.created_at, p.updated_at
    FROM project p
    JOIN client c ON c.id = p.client_id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const { rows } = await tx.query(dataSql, dataParams);

  return {
    data: rows.map(r => ({
      id: r.id,
      clientId: r.client_id,
      name: r.name,
      description: r.description,
      startDate: r.start_date,
      endDate: r.end_date,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

/**
 * Get a single project
 */
export async function getProject(
  tx: PoolClient,
  projectId: string,
  organizationId: string
): Promise<ProjectResult> {
  const { rows } = await tx.query(
    `SELECT p.id, p.client_id, p.name, p.description, p.start_date, p.end_date, 
            p.active, p.created_at, p.updated_at
     FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );

  if (rows.length === 0) throw notFound('Project not found');

  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    startDate: r.start_date,
    endDate: r.end_date,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Create a project (ADMIN only)
 */
export async function createProject(
  tx: PoolClient,
  organizationId: string,
  clientId: string,
  name: string,
  description?: string | null,
  startDate?: string | null,
  endDate?: string | null
): Promise<ProjectResult> {
  // Verify client belongs to organization
  const { rows: clientRows } = await tx.query(
    'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
    [clientId, organizationId]
  );
  if (clientRows.length === 0) throw forbidden('Client does not belong to organization');

  // Check unique constraint (client_id, name)
  const { rows: existing } = await tx.query(
    'SELECT id FROM project WHERE client_id = $1 AND name = $2',
    [clientId, name]
  );
  if (existing.length > 0) throw badRequest('Project with this name already exists for client');

  const { rows } = await tx.query(
    `INSERT INTO project (client_id, name, description, start_date, end_date, active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, client_id, name, description, start_date, end_date, active, created_at, updated_at`,
    [clientId, name, description || null, startDate || null, endDate || null]
  );

  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    startDate: r.start_date,
    endDate: r.end_date,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Update a project (ADMIN only)
 */
export async function updateProject(
  tx: PoolClient,
  projectId: string,
  organizationId: string,
  updates: { name?: string; description?: string | null; startDate?: string | null; endDate?: string | null; active?: boolean }
): Promise<ProjectResult> {
  // Verify project exists in organization
  const { rows: existing } = await tx.query(
    `SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (existing.length === 0) throw notFound('Project not found');

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

  if (updates.startDate !== undefined) {
    updateFields.push(`start_date = $${paramIndex}`);
    params.push(updates.startDate);
    paramIndex++;
  }

  if (updates.endDate !== undefined) {
    updateFields.push(`end_date = $${paramIndex}`);
    params.push(updates.endDate);
    paramIndex++;
  }

  if (updates.active !== undefined) {
    updateFields.push(`active = $${paramIndex}`);
    params.push(updates.active);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(projectId);
  const { rows } = await tx.query(
    `UPDATE project SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, client_id, name, description, start_date, end_date, active, created_at, updated_at`,
    params
  );

  const r = rows[0];
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    startDate: r.start_date,
    endDate: r.end_date,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Get project members
 */
export async function getProjectMembers(
  tx: PoolClient,
  projectId: string,
  organizationId: string
): Promise<ProjectMemberResult[]> {
  // Verify project exists in organization
  const { rows: projectRows } = await tx.query(
    `SELECT 1 FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw notFound('Project not found');

  const { rows } = await tx.query(
    `SELECT project_id, user_id, role, can_raise, can_be_assigned, created_at
     FROM project_member
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );

  return rows.map(r => ({
    projectId: r.project_id,
    userId: r.user_id,
    role: r.role,
    canRaise: r.can_raise,
    canBeAssigned: r.can_be_assigned,
    createdAt: r.created_at,
  }));
}

/**
 * Add project member (ADMIN only)
 */
export async function addProjectMember(
  tx: PoolClient,
  projectId: string,
  userId: string,
  organizationId: string,
  role: 'MEMBER' | 'MANAGER' | 'VIEWER',
  canRaise: boolean,
  canBeAssigned: boolean
): Promise<ProjectMemberResult> {
  // Verify project exists in organization
  const { rows: projectRows } = await tx.query(
    `SELECT 1 FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw notFound('Project not found');

  // Verify user exists in organization
  const { rows: userRows } = await tx.query(
    'SELECT id FROM app_user WHERE id = $1 AND organization_id = $2',
    [userId, organizationId]
  );
  if (userRows.length === 0) throw notFound('User not found');

  // Check if already a member
  const { rows: existingRows } = await tx.query(
    'SELECT 1 FROM project_member WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  if (existingRows.length > 0) throw badRequest('User is already a project member');

  const { rows } = await tx.query(
    `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING project_id, user_id, role, can_raise, can_be_assigned, created_at`,
    [projectId, userId, role, canRaise, canBeAssigned]
  );

  const r = rows[0];
  return {
    projectId: r.project_id,
    userId: r.user_id,
    role: r.role,
    canRaise: r.can_raise,
    canBeAssigned: r.can_be_assigned,
    createdAt: r.created_at,
  };
}

/**
 * Update project member (ADMIN only)
 */
export async function updateProjectMember(
  tx: PoolClient,
  projectId: string,
  userId: string,
  organizationId: string,
  updates: { role?: 'MEMBER' | 'MANAGER' | 'VIEWER'; canRaise?: boolean; canBeAssigned?: boolean }
): Promise<ProjectMemberResult> {
  // Verify project exists in organization
  const { rows: projectRows } = await tx.query(
    `SELECT 1 FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw notFound('Project not found');

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.role !== undefined) {
    updateFields.push(`role = $${paramIndex}`);
    params.push(updates.role);
    paramIndex++;
  }

  if (updates.canRaise !== undefined) {
    updateFields.push(`can_raise = $${paramIndex}`);
    params.push(updates.canRaise);
    paramIndex++;
  }

  if (updates.canBeAssigned !== undefined) {
    updateFields.push(`can_be_assigned = $${paramIndex}`);
    params.push(updates.canBeAssigned);
    paramIndex++;
  }

  if (updateFields.length === 0) throw badRequest('No fields to update');

  params.push(projectId, userId);
  const { rows } = await tx.query(
    `UPDATE project_member SET ${updateFields.join(', ')} 
     WHERE project_id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING project_id, user_id, role, can_raise, can_be_assigned, created_at`,
    params
  );

  if (rows.length === 0) throw notFound('Project member not found');

  const r = rows[0];
  return {
    projectId: r.project_id,
    userId: r.user_id,
    role: r.role,
    canRaise: r.can_raise,
    canBeAssigned: r.can_be_assigned,
    createdAt: r.created_at,
  };
}

/**
 * Remove project member (ADMIN only)
 */
export async function removeProjectMember(
  tx: PoolClient,
  projectId: string,
  userId: string,
  organizationId: string
): Promise<void> {
  // Verify project exists in organization
  const { rows: projectRows } = await tx.query(
    `SELECT 1 FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`,
    [projectId, organizationId]
  );
  if (projectRows.length === 0) throw notFound('Project not found');

  const { rows } = await tx.query(
    'DELETE FROM project_member WHERE project_id = $1 AND user_id = $2 RETURNING project_id',
    [projectId, userId]
  );

  if (rows.length === 0) throw notFound('Project member not found');
}
