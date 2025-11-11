import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import bcrypt from 'bcryptjs';
import { Role } from '../../types/common';

export interface TestUser {
  userId: string;
  organizationId: string;
  role: Role;
  clientId: string | null;
  email: string;
  fullName: string;
  token?: string;
}

export interface TestContext {
  admin: TestUser;
  employee?: TestUser;
  client?: TestUser;
  clientUser?: TestUser;
  organizationId: string;
  clientId?: string;
  projectId?: string;
}

/**
 * Create a test organization and admin user
 */
export async function createTestAdmin(tx: PoolClient): Promise<TestUser> {
  const unique = Date.now() + Math.random();
  const email = `test-admin-${unique}@example.com`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const organizationName = `Test Org ${unique}`;

  // Create organization
  const { rows: orgRows } = await tx.query(
    'INSERT INTO organization (name) VALUES ($1) RETURNING id',
    [organizationName]
  );
  const organizationId = orgRows[0].id;

  // Create admin user
  const { rows: userRows } = await tx.query(
    `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`,
    [organizationId, 'ADMIN', email, 'Test Admin', passwordHash]
  );
  const userId = userRows[0].id;

  return {
    userId,
    organizationId,
    role: 'ADMIN',
    clientId: null,
    email,
    fullName: 'Test Admin',
  };
}

/**
 * Create a test employee user
 */
export async function createTestEmployee(
  tx: PoolClient,
  organizationId: string
): Promise<TestUser> {
  const unique = Date.now() + Math.random();
  const email = `test-employee-${unique}@example.com`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  const { rows: userRows } = await tx.query(
    `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`,
    [organizationId, 'EMPLOYEE', email, 'Test Employee', passwordHash]
  );
  const userId = userRows[0].id;

  return {
    userId,
    organizationId,
    role: 'EMPLOYEE',
    clientId: null,
    email,
    fullName: 'Test Employee',
  };
}

/**
 * Create a test client
 */
export async function createTestClient(
  tx: PoolClient,
  organizationId: string
): Promise<{ id: string; name: string; email: string }> {
  const unique = Date.now() + Math.random();
  const name = `Test Client ${unique}`;
  const email = `test-client-${unique}@example.com`;

  const { rows } = await tx.query(
    `INSERT INTO client (organization_id, name, email, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name, email`,
    [organizationId, name, email]
  );

  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
  };
}

/**
 * Create a test client user
 */
export async function createTestClientUser(
  tx: PoolClient,
  organizationId: string,
  clientId: string
): Promise<TestUser> {
  const unique = Date.now() + Math.random();
  const email = `test-client-user-${unique}@example.com`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  const { rows: userRows } = await tx.query(
    `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [organizationId, 'CLIENT', email, 'Test Client User', passwordHash, clientId]
  );
  const userId = userRows[0].id;

  return {
    userId,
    organizationId,
    role: 'CLIENT',
    clientId,
    email,
    fullName: 'Test Client User',
  };
}

/**
 * Create a test project
 */
export async function createTestProject(
  tx: PoolClient,
  clientId: string,
  name?: string
): Promise<{ id: string; name: string; clientId: string }> {
  const unique = Date.now() + Math.random();
  const projectName = name || `Test Project ${unique}`;

  const { rows } = await tx.query(
    `INSERT INTO project (client_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name, client_id`,
    [clientId, projectName, 'Test project description']
  );

  return {
    id: rows[0].id,
    name: rows[0].name,
    clientId: rows[0].client_id,
  };
}

/**
 * Add a user as a project member
 */
export async function addProjectMember(
  tx: PoolClient,
  projectId: string,
  userId: string,
  role: 'MANAGER' | 'MEMBER' = 'MEMBER',
  canRaise: boolean = true,
  canBeAssigned: boolean = true
): Promise<void> {
  await tx.query(
    `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, user_id) DO UPDATE
     SET role = $3, can_raise = $4, can_be_assigned = $5`,
    [projectId, userId, role, canRaise, canBeAssigned]
  );
}

/**
 * Get taxonomy items (priority, status, etc.)
 */
export async function getTaxonomyItem(
  tx: PoolClient,
  type: 'priority' | 'status',
  name?: string
): Promise<{ id: string; name: string }> {
  const table = type === 'priority' ? 'priority' : 'status';
  let query = `SELECT id, name FROM ${table} WHERE is_active = true`;
  const params: any[] = [];

  if (name) {
    query += ' AND name = $1';
    params.push(name);
  }

  query += ' LIMIT 1';

  const { rows } = await tx.query(query, params);
  if (rows.length === 0) {
    throw new Error(`No ${type} found`);
  }
  return { id: rows[0].id, name: rows[0].name };
}

/**
 * Create a test stream
 */
export async function createTestStream(
  tx: PoolClient,
  projectId: string,
  name?: string
): Promise<{ id: string; name: string }> {
  const unique = Date.now() + Math.random();
  const streamName = name || `Test Stream ${unique}`;

  const { rows } = await tx.query(
    `INSERT INTO stream (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name`,
    [projectId, streamName, 'Test stream description']
  );

  return { id: rows[0].id, name: rows[0].name };
}

/**
 * Create a test subject
 */
export async function createTestSubject(
  tx: PoolClient,
  projectId: string,
  name?: string
): Promise<{ id: string; name: string }> {
  const unique = Date.now() + Math.random();
  const subjectName = name || `Test Subject ${unique}`;

  const { rows } = await tx.query(
    `INSERT INTO subject (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name`,
    [projectId, subjectName, 'Test subject description']
  );

  return { id: rows[0].id, name: rows[0].name };
}

/**
 * Clean up test data (optional, for cleanup between tests)
 */
export async function cleanupTestData(tx: PoolClient, organizationId: string): Promise<void> {
  // Delete in reverse order of dependencies
  await tx.query('DELETE FROM ticket WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
  await tx.query('DELETE FROM stream WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
  await tx.query('DELETE FROM subject WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
  await tx.query('DELETE FROM project_member WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
  await tx.query('DELETE FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1)', [organizationId]);
  await tx.query('DELETE FROM app_user WHERE organization_id = $1', [organizationId]);
  await tx.query('DELETE FROM client WHERE organization_id = $1', [organizationId]);
  await tx.query('DELETE FROM organization WHERE id = $1', [organizationId]);
}

/**
 * Generate JWT token for testing
 */
export async function generateTestToken(
  server: any,
  user: TestUser
): Promise<string> {
  return await server.jwt.sign({
    sub: user.userId,
    organizationId: user.organizationId,
    role: user.role,
    clientId: user.clientId,
  });
}

