import { describe, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import server from '../server';

describe('Auth flow', () => {
  const unique = Date.now();
  const email = `admin-test+${unique}@example.com`;
  const password = 'SecurePass123!';

  before(async () => {
    await server.ready();

    // Ensure organization and admin exist
    const signupRes = await request(server.server)
      .post('/auth/signup')
      .send({
        organizationName: `Auth Test Org ${unique}`,
        fullName: 'Test Admin',
        email,
        password,
      });

    assert.equal(signupRes.status, 200, `Signup failed: ${signupRes.text}`);
  });

  test('login and me', async () => {
    const resLogin = await request(server.server)
      .post('/auth/login')
      .send({ email, password });

    assert.equal(resLogin.status, 200, `Login failed: ${resLogin.text}`);
    assert.ok(resLogin.body.accessToken);

    const me = await request(server.server)
      .get('/auth/me')
      .set('authorization', `Bearer ${resLogin.body.accessToken}`);

    assert.equal(me.status, 200, `Me failed: ${me.text}`);
    assert.ok(me.body.id);
    assert.equal(me.body.organizationId, resLogin.body.user.organizationId);
    assert.equal(typeof me.body.role, 'string');
  });
});
