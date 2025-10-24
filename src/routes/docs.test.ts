import { describe, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import server from '../server';

const RESOURCE_URI = '/docs';

describe(`${RESOURCE_URI}`, () => {
  before(async () => {
    await server.ready();
  });

  test('swagger UI is accessible without auth', async () => {
    const res = await request(server.server).get(RESOURCE_URI);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'] || '', /text\/html/);
  });
});
