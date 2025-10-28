import { describe, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import server from '../server';

const EMAIL = process.env.ADMIN_EMAIL || 'admin@acme.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

describe('API end-to-end', () => {
  before(async () => {
    await server.ready();
  });

  
  let token: string;
  let userId: string;
  let tenantId: string;

  test('login and obtain token', async () => {
    const res = await request(server.server).post('/auth/login').send({ email: EMAIL, password: PASSWORD });
    assert.equal(res.status, 200, `Login failed: ${res.text}`);
    assert.ok(res.body.accessToken, 'no access token returned');
    token = res.body.accessToken;

    const me = await request(server.server).get('/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 200, `Me failed: ${me.text}`);
    assert.ok(me.body.user, 'me did not return user');
    userId = me.body.user.id;
    tenantId = me.body.user.tenantId || me.body.user.tenant_id || me.body.user.tenant;
    assert.ok(tenantId, 'tenant id not present on me');
  });

  test('clients -> projects -> tickets -> comments -> tags -> users/tenants', async () => {
    // create client
    const clientName = `test-client-${Date.now()}`;
    const resClient = await request(server.server)
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: clientName });
    assert.equal(resClient.status, 201, `create client failed: ${resClient.text}`);
    const client = resClient.body;
    assert.ok(client.id, 'client id missing');

    // get client
    const getClient = await request(server.server).get(`/clients/${client.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(getClient.status, 200);

    // create project
    const resProject = await request(server.server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, name: 'Test Project', code: `TP${Math.floor(Math.random() * 10000)}` });
    assert.equal(resProject.status, 201, `create project failed: ${resProject.text}`);
    const project = resProject.body;
    assert.ok(project.id, 'project id missing');

    // create tag
    const resTag = await request(server.server)
      .post('/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test-tag', color: '#00ff00', clientId: client.id });
    assert.equal(resTag.status, 201, `create tag failed: ${resTag.text}`);
    const tag = resTag.body;
    assert.ok(tag.id, 'tag id missing');

    // create ticket
    const resTicket = await request(server.server)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        projectId: project.id,
        title: 'Test ticket',
        descriptionMd: 'Some description',
        tagIds: [tag.id],
      });
    assert.equal(resTicket.status, 201, `create ticket failed: ${resTicket.text}`);
    const ticket = resTicket.body;
    assert.ok(ticket.id, 'ticket id missing');

    // list tickets
    const listTickets = await request(server.server).get('/tickets').set('Authorization', `Bearer ${token}`);
    assert.equal(listTickets.status, 200);
    assert.ok(Array.isArray(listTickets.body.items));

    // get ticket
    const getTicket = await request(server.server).get(`/tickets/${ticket.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(getTicket.status, 200);

    // add comment
    const resComment = await request(server.server)
      .post('/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketId: ticket.id, bodyMd: 'A test comment' });
    assert.equal(resComment.status, 201, `add comment failed: ${resComment.text}`);

    // list comments
    const listComments = await request(server.server).get(`/tickets/${ticket.id}/comments`).set('Authorization', `Bearer ${token}`);
    assert.equal(listComments.status, 200);
    assert.ok(Array.isArray(listComments.body));

    // users assignable
    const assignable = await request(server.server).get('/users/assignable').set('Authorization', `Bearer ${token}`);
    assert.equal(assignable.status, 200);

    // tenants me
    const meTenant = await request(server.server).get('/tenants/me').set('Authorization', `Bearer ${token}`);
    assert.equal(meTenant.status, 200);
    assert.equal(meTenant.body.id, tenantId);

    // cleanup: delete tag
    const delTag = await request(server.server).delete(`/tags/${tag.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(delTag.status, 200);
  });
});
