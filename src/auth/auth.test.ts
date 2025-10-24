import { describe, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import server from '../server';

const EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

describe('Auth flow', () => {
  before(async () => {
    await server.ready();
  });

  test('login and me', async (t) => {
    const resLogin = await request(server.server)
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    assert.equal(resLogin.status, 200, `Login failed: ${resLogin.text}`);
    assert.ok(resLogin.body.accessToken);

    const me = await request(server.server)
      .get('/auth/me')
      .set('authorization', `Bearer ${resLogin.body.accessToken}`);

    assert.equal(me.status, 200, `Me failed: ${me.text}`);
    assert.ok(me.body.user);
  });
});
