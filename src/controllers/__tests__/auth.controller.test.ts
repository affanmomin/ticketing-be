import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import server from '../../server';
import { pool } from '../../db/pool';
import { createTestAdmin } from '../../__tests__/helpers/test-utils';
import bcrypt from 'bcryptjs';

const request = supertest(server.server);

describe('Auth Controller - Integration Tests', () => {
  let serverReady = false;
  let tx: any;

  before(async () => {
    if (!serverReady) {
      await server.ready();
      serverReady = true;
    }
    tx = await pool.connect();
  });

  after(async () => {
    if (tx) {
      tx.release();
    }
  });

  test('POST /auth/signup - creates organization and admin user', async () => {
    const unique = Date.now() + Math.random();
    const email = `signup-test-${unique}@example.com`;

    const response = await request.post('/auth/signup').send({
      organizationName: `Test Org ${unique}`,
      fullName: 'Test Admin',
      email,
      password: 'SecurePass123!',
    });

    assert.equal(response.status, 200);
    assert.ok(response.body.accessToken);
    assert.ok(response.body.user);
    assert.equal(response.body.user.email, email);
    assert.equal(response.body.user.role, 'ADMIN');
    assert.ok(response.body.user.id);
    assert.ok(response.body.user.organizationId);
  });

  test('POST /auth/signup - fails with duplicate email', async () => {
    const unique = Date.now() + Math.random();
    const email = `duplicate-signup-${unique}@example.com`;

    // First signup
    await request.post('/auth/signup').send({
      organizationName: `Org 1 ${unique}`,
      fullName: 'Admin 1',
      email,
      password: 'SecurePass123!',
    });

    // Second signup with same email
    const response = await request.post('/auth/signup').send({
      organizationName: `Org 2 ${unique}`,
      fullName: 'Admin 2',
      email,
      password: 'SecurePass123!',
    });

    assert.equal(response.status, 400);
    assert.ok(response.body.message.includes('Email already in use'));
  });

  test('POST /auth/login - succeeds with valid credentials', async () => {
    const unique = Date.now() + Math.random();
    const email = `login-controller-${unique}@example.com`;
    const password = 'SecurePass123!';

    // Create user via signup
    const signupRes = await request.post('/auth/signup').send({
      organizationName: `Login Org ${unique}`,
      fullName: 'Login Test User',
      email,
      password,
    });

    assert.equal(signupRes.status, 200);

    // Login
    const loginRes = await request.post('/auth/login').send({
      email,
      password,
    });

    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.accessToken);
    assert.equal(loginRes.body.user.email, email);
    assert.equal(loginRes.body.user.role, 'ADMIN');
  });

  test('POST /auth/login - fails with invalid email', async () => {
    const response = await request.post('/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'password',
    });

    assert.equal(response.status, 401);
    assert.ok(response.body.message.includes('Invalid credentials'));
  });

  test('POST /auth/login - fails with invalid password', async () => {
    const unique = Date.now() + Math.random();
    const email = `login-password-${unique}@example.com`;
    const password = 'SecurePass123!';

    // Create user
    await request.post('/auth/signup').send({
      organizationName: `Password Org ${unique}`,
      fullName: 'Password Test User',
      email,
      password,
    });

    // Try wrong password
    const response = await request.post('/auth/login').send({
      email,
      password: 'WrongPassword123!',
    });

    assert.equal(response.status, 401);
    assert.ok(response.body.message.includes('Invalid credentials'));
  });

  test('GET /auth/me - returns user info with valid token', async () => {
    const unique = Date.now() + Math.random();
    const email = `me-test-${unique}@example.com`;
    const password = 'SecurePass123!';

    // Signup
    const signupRes = await request.post('/auth/signup').send({
      organizationName: `Me Org ${unique}`,
      fullName: 'Me Test User',
      email,
      password,
    });

    const token = signupRes.body.accessToken;

    // Get me
    const meRes = await request
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.ok(meRes.body.id);
    assert.ok(meRes.body.organizationId);
    assert.equal(typeof meRes.body.role, 'string');
  });

  test('GET /auth/me - fails without token', async () => {
    const response = await request.get('/auth/me');

    assert.equal(response.status, 401);
  });

  test('GET /auth/me - fails with invalid token', async () => {
    const response = await request
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    assert.equal(response.status, 401);
  });

  test('POST /auth/logout - returns success', async () => {
    const response = await request.post('/auth/logout');

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
  });
});

