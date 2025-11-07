import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import server from '../server';
import { pool } from '../db/pool';

const request = supertest(server.server);

// Keep a flag to close server once
let serverReady = false;
let constraintEnsured = false;

test('end-to-end workflow', async () => {
  if (!serverReady) {
    await server.ready();
    serverReady = true;
  }

  if (!constraintEnsured) {
    const client = await pool.connect();
    try {
      await client.query(
        `ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_user_type_check;`
      );
      await client.query(
        `ALTER TABLE app_user ADD CONSTRAINT app_user_user_type_check CHECK (user_type IN ('ADMIN','EMPLOYEE','CLIENT'));`
      );
      constraintEnsured = true;
    } finally {
      client.release();
    }
  }

  const unique = Date.now();
  const adminEmail = `admin+${unique}@example.com`;
  const employeeEmail = `employee+${unique}@example.com`;
  const clientUserEmail = `client+${unique}@example.com`;

  // Admin signup
  const signupRes = await request.post('/auth/signup').send({
    organizationName: `Org ${unique}`,
    fullName: 'Admin User',
    email: adminEmail,
    password: 'SecurePass123!',
  });
  assert.equal(signupRes.status, 200);
  const adminToken = signupRes.body.accessToken;
  assert.ok(adminToken);
  const adminId = signupRes.body.user.id;

  // Create employee
  const employeeRes = await request
    .post('/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'Employee User',
      email: employeeEmail,
      password: 'SecurePass123!',
    });
  assert.equal(employeeRes.status, 201, `Create employee failed: ${employeeRes.text}`);
  const employeeId = employeeRes.body.id;

  // Create client
  const clientRes = await request
    .post('/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Client ${unique}`,
      email: `client-contact+${unique}@example.com`,
    });
  assert.equal(clientRes.status, 201);
  const clientId = clientRes.body.id;
  assert.ok(clientId);

  // Create client user
  const clientUserRes = await request
    .post('/client-users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'Client Portal User',
      email: clientUserEmail,
      password: 'SecurePass123!',
      clientId,
    });
  assert.equal(clientUserRes.status, 201);

  // Create stream & subject
  const streamRes = await request
    .post(`/clients/${clientId}/streams`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Stream ${unique}`,
      description: 'Main stream',
    });
  assert.equal(streamRes.status, 201);
  const streamId = streamRes.body.id;

  const subjectRes = await request
    .post(`/clients/${clientId}/subjects`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Subject ${unique}`,
      description: 'Main subject',
    });
  assert.equal(subjectRes.status, 201);
  const subjectId = subjectRes.body.id;

  // Fetch taxonomy
  const priorityRes = await request
    .get('/taxonomy/priority')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(priorityRes.status, 200);
  const priorityId = priorityRes.body[0].id;

  const statusRes = await request
    .get('/taxonomy/status')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(statusRes.status, 200);
  const statusId = statusRes.body.find((s: any) => !s.isClosed)?.id ?? statusRes.body[0].id;

  // Create project
  const projectRes = await request
    .post('/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      clientId,
      name: `Project ${unique}`,
      description: 'E2E Test Project',
    });
  assert.equal(projectRes.status, 201);
  const projectId = projectRes.body.id;

  // Add admin as project manager
  const adminMemberRes = await request
    .post(`/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: adminId,
      role: 'MANAGER',
      canRaise: true,
      canBeAssigned: true,
    });
  assert.equal(adminMemberRes.status, 201);

  // Add employee as member with assignment rights
  const employeeMemberRes = await request
    .post(`/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: employeeId,
      role: 'MEMBER',
      canRaise: true,
      canBeAssigned: true,
    });
  assert.equal(employeeMemberRes.status, 201);

  // Create ticket assigned to employee
  const ticketRes = await request
    .post('/tickets')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      projectId,
      streamId,
      subjectId,
      priorityId,
      statusId,
      title: `Ticket ${unique}`,
      descriptionMd: 'Initial ticket description',
      assignedToUserId: employeeId,
    });
  assert.equal(ticketRes.status, 201);
  const ticketId = ticketRes.body.id;
  assert.equal(ticketRes.body.assignedToUserId, employeeId);

  // Update ticket status (admin)
  const newStatusId = statusRes.body.find((s: any) => s.id !== statusId)?.id ?? statusId;
  const updateTicketRes = await request
    .post(`/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ statusId: newStatusId });
  assert.equal(updateTicketRes.status, 200, `Update ticket failed: ${updateTicketRes.text}`);
  assert.equal(updateTicketRes.body.statusId, newStatusId);

  // Add admin comment (internal)
  const adminCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ visibility: 'INTERNAL', bodyMd: 'Internal update' });
  assert.equal(adminCommentRes.status, 201);

  // Client login
  const clientLoginRes = await request.post('/auth/login').send({
    email: clientUserEmail,
    password: 'SecurePass123!',
  });
  assert.equal(clientLoginRes.status, 200);
  const clientToken = clientLoginRes.body.accessToken;

  // Client lists tickets (should see their own)
  const clientTicketsRes = await request
    .get('/tickets')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientTicketsRes.status, 200);
  assert.ok(clientTicketsRes.body.total >= 1);

  // Client creates public comment
  const clientCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ visibility: 'PUBLIC', bodyMd: 'Client reply' });
  assert.equal(clientCommentRes.status, 201);

  // Client cannot create internal comment
  const forbiddenCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ visibility: 'INTERNAL', bodyMd: 'Should fail' });
  assert.equal(forbiddenCommentRes.status, 403);

  // List comments as client (should only see public)
  const clientCommentsRes = await request
    .get(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientCommentsRes.status, 200);
  assert.ok(clientCommentsRes.body.every((comment: any) => comment.visibility === 'PUBLIC'));

  // List comments as admin (see all)
  const adminCommentsRes = await request
    .get(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(adminCommentsRes.status, 200);
  assert.ok(adminCommentsRes.body.some((comment: any) => comment.visibility === 'INTERNAL'));
});

after(async () => {
  await server.close();
});
