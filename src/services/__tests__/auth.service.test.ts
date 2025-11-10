import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../db/pool';
import { adminSignup, login, createUser, getUserById } from '../auth.service';
import { badRequest, unauthorized, forbidden } from '../../utils/errors';
import {
  createTestAdmin,
  createTestEmployee,
  createTestClient,
  createTestClientUser,
} from '../../__tests__/helpers/test-utils';

describe('Auth Service - Unit Tests', () => {
  let tx: any;
  let testOrgId: string;
  let testAdmin: any;

  before(async () => {
    tx = await pool.connect();
    await tx.query('BEGIN');
  });

  after(async () => {
    if (tx) {
      try {
        await tx.query('ROLLBACK');
      } catch {}
      tx.release();
    }
  });

  test('adminSignup - creates organization and admin user', async () => {
    const unique = Date.now() + Math.random();
    const email = `admin-signup-${unique}@example.com`;
    const passwordHash = 'hashed_password';
    const organizationName = `Test Org ${unique}`;

    const result = await adminSignup(tx, organizationName, 'Admin User', email, passwordHash);

    assert.ok(result.userId);
    assert.ok(result.organizationId);
    assert.equal(result.role, 'ADMIN');
    assert.equal(result.clientId, null);
    assert.equal(result.email, email);
    assert.equal(result.fullName, 'Admin User');

    // Verify organization was created
    const { rows: orgRows } = await tx.query('SELECT id, name FROM organization WHERE id = $1', [
      result.organizationId,
    ]);
    assert.equal(orgRows.length, 1);
    assert.equal(orgRows[0].name, organizationName);

    // Verify user was created
    const { rows: userRows } = await tx.query('SELECT * FROM app_user WHERE id = $1', [
      result.userId,
    ]);
    assert.equal(userRows.length, 1);
    assert.equal(userRows[0].user_type, 'ADMIN');
    assert.equal(userRows[0].organization_id, result.organizationId);

    testOrgId = result.organizationId;
    testAdmin = result;
  });

  test('adminSignup - throws error if email already exists', async () => {
    const unique = Date.now() + Math.random();
    const email = `duplicate-${unique}@example.com`;
    const passwordHash = 'hashed_password';
    const organizationName = `Test Org ${unique}`;

    // First signup
    await adminSignup(tx, organizationName, 'Admin 1', email, passwordHash);

    // Second signup with same email should fail
    await assert.rejects(
      async () => {
        await adminSignup(tx, `Org 2 ${unique}`, 'Admin 2', email, passwordHash);
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('Email already in use');
      }
    );
  });

  test('login - succeeds with valid credentials', async () => {
    const unique = Date.now() + Math.random();
    const email = `login-test-${unique}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await import('bcryptjs').then(m => m.default.hash(password, 10));

    // Create user manually
    const { rows: orgRows } = await tx.query(
      'INSERT INTO organization (name) VALUES ($1) RETURNING id',
      [`Login Test Org ${unique}`]
    );
    const orgId = orgRows[0].id;

    await tx.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, NULL, true)`,
      [orgId, 'ADMIN', email, 'Login Test User', passwordHash]
    );

    const result = await login(tx, email, password);

    assert.ok(result.userId);
    assert.equal(result.organizationId, orgId);
    assert.equal(result.role, 'ADMIN');
    assert.equal(result.email, email);
  });

  test('login - fails with invalid email', async () => {
    await assert.rejects(
      async () => {
        await login(tx, 'nonexistent@example.com', 'password');
      },
      (err: any) => {
        return err.statusCode === 401 && err.message.includes('Invalid credentials');
      }
    );
  });

  test('login - fails with invalid password', async () => {
    const unique = Date.now() + Math.random();
    const email = `login-password-test-${unique}@example.com`;
    const password = 'CorrectPassword123!';
    const passwordHash = await import('bcryptjs').then(m => m.default.hash(password, 10));

    // Create user
    const { rows: orgRows } = await tx.query(
      'INSERT INTO organization (name) VALUES ($1) RETURNING id',
      [`Password Test Org ${unique}`]
    );
    const orgId = orgRows[0].id;

    await tx.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, NULL, true)`,
      [orgId, 'ADMIN', email, 'Password Test User', passwordHash]
    );

    // Try wrong password
    await assert.rejects(
      async () => {
        await login(tx, email, 'WrongPassword123!');
      },
      (err: any) => {
        return err.statusCode === 401 && err.message.includes('Invalid credentials');
      }
    );
  });

  test('login - fails with inactive user', async () => {
    const unique = Date.now() + Math.random();
    const email = `inactive-test-${unique}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await import('bcryptjs').then(m => m.default.hash(password, 10));

    // Create user
    const { rows: orgRows } = await tx.query(
      'INSERT INTO organization (name) VALUES ($1) RETURNING id',
      [`Inactive Test Org ${unique}`]
    );
    const orgId = orgRows[0].id;

    await tx.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, NULL, false)`,
      [orgId, 'ADMIN', email, 'Inactive User', passwordHash]
    );

    // Try to login
    await assert.rejects(
      async () => {
        await login(tx, email, password);
      },
      (err: any) => {
        return err.statusCode === 401 && err.message.includes('Invalid credentials');
      }
    );
  });

  test('login - sets clientId for CLIENT users', async () => {
    const unique = Date.now() + Math.random();
    const email = `client-login-${unique}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await import('bcryptjs').then(m => m.default.hash(password, 10));

    // Create org, client, and client user
    const { rows: orgRows } = await tx.query(
      'INSERT INTO organization (name) VALUES ($1) RETURNING id',
      [`Client Login Org ${unique}`]
    );
    const orgId = orgRows[0].id;

    const { rows: clientRows } = await tx.query(
      'INSERT INTO client (organization_id, name, email, active) VALUES ($1, $2, $3, true) RETURNING id',
      [orgId, 'Test Client', `client-${unique}@example.com`]
    );
    const clientId = clientRows[0].id;

    await tx.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [orgId, 'CLIENT', email, 'Client User', passwordHash, clientId]
    );

    const result = await login(tx, email, password);

    assert.equal(result.role, 'CLIENT');
    assert.equal(result.clientId, clientId);
  });

  test('createUser - creates EMPLOYEE user', async () => {
    const admin = await createTestAdmin(tx);
    const passwordHash = await import('bcryptjs').then(m => m.default.hash('TestPass123!', 10));

    const result = await createUser(tx, {
      organizationId: admin.organizationId,
      userType: 'EMPLOYEE',
      email: `employee-${Date.now()}@example.com`,
      fullName: 'Test Employee',
      passwordHash,
      clientId: null,
    });

    assert.equal(result.role, 'EMPLOYEE');
    assert.equal(result.clientId, null);
    assert.ok(result.userId);
  });

  test('createUser - creates CLIENT user with valid clientId', async () => {
    const admin = await createTestAdmin(tx);
    const client = await createTestClient(tx, admin.organizationId);
    const passwordHash = await import('bcryptjs').then(m => m.default.hash('TestPass123!', 10));

    const result = await createUser(tx, {
      organizationId: admin.organizationId,
      userType: 'CLIENT',
      email: `client-user-${Date.now()}@example.com`,
      fullName: 'Test Client User',
      passwordHash,
      clientId: client.id,
    });

    assert.equal(result.role, 'CLIENT');
    assert.equal(result.clientId, client.id);
    assert.ok(result.userId);
  });

  test('createUser - rejects EMPLOYEE with clientId', async () => {
    const admin = await createTestAdmin(tx);
    const client = await createTestClient(tx, admin.organizationId);
    const passwordHash = await import('bcryptjs').then(m => m.default.hash('TestPass123!', 10));

    await assert.rejects(
      async () => {
        await createUser(tx, {
          organizationId: admin.organizationId,
          userType: 'EMPLOYEE',
          email: `employee-${Date.now()}@example.com`,
          fullName: 'Test Employee',
          passwordHash,
          clientId: client.id,
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('must have client_id = NULL');
      }
    );
  });

  test('createUser - rejects CLIENT without clientId', async () => {
    const admin = await createTestAdmin(tx);
    const passwordHash = await import('bcryptjs').then(m => m.default.hash('TestPass123!', 10));

    await assert.rejects(
      async () => {
        await createUser(tx, {
          organizationId: admin.organizationId,
          userType: 'CLIENT',
          email: `client-user-${Date.now()}@example.com`,
          fullName: 'Test Client User',
          passwordHash,
          clientId: null,
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('must have a valid client_id');
      }
    );
  });

  test('createUser - rejects CLIENT with clientId from different org', async () => {
    const admin1 = await createTestAdmin(tx);
    const admin2 = await createTestAdmin(tx);
    const client2 = await createTestClient(tx, admin2.organizationId);
    const passwordHash = await import('bcryptjs').then(m => m.default.hash('TestPass123!', 10));

    await assert.rejects(
      async () => {
        await createUser(tx, {
          organizationId: admin1.organizationId,
          userType: 'CLIENT',
          email: `client-user-${Date.now()}@example.com`,
          fullName: 'Test Client User',
          passwordHash,
          clientId: client2.id,
        });
      },
      (err: any) => {
        return err.statusCode === 403 && err.message.includes('does not belong to organization');
      }
    );
  });

  test('getUserById - returns user data', async () => {
    const admin = await createTestAdmin(tx);

    const result = await getUserById(tx, admin.userId);

    assert.equal(result.userId, admin.userId);
    assert.equal(result.organizationId, admin.organizationId);
    assert.equal(result.role, admin.role);
    assert.equal(result.email, admin.email);
  });

  test('getUserById - throws error for non-existent user', async () => {
    await assert.rejects(
      async () => {
        await getUserById(tx, '00000000-0000-0000-0000-000000000000');
      },
      (err: any) => {
        return err.statusCode === 401 && err.message.includes('User not found');
      }
    );
  });
});

