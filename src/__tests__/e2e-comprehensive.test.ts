import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import server from '../server';
import { pool } from '../db/pool';

const request = supertest(server.server);

// Keep a flag to close server once
let serverReady = false;
let constraintEnsured = false;

before(async () => {
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
});

after(async () => {
  await server.close();
});

test('E2E: Complete workflow - Auth, Users, Clients, Projects, Tickets, Comments', async () => {
  const unique = Date.now();
  const adminEmail = `admin-e2e-${unique}@example.com`;
  const employeeEmail = `employee-e2e-${unique}@example.com`;
  const clientUserEmail = `client-user-e2e-${unique}@example.com`;

  // 1. Admin signup
  const signupRes = await request.post('/auth/signup').send({
    organizationName: `E2E Org ${unique}`,
    fullName: 'E2E Admin',
    email: adminEmail,
    password: 'SecurePass123!',
  });
  assert.equal(signupRes.status, 200, `Signup failed: ${signupRes.text}`);
  const adminToken = signupRes.body.accessToken;
  assert.ok(adminToken);
  const adminId = signupRes.body.user.id;
  const orgId = signupRes.body.user.organizationId;

  // 2. Login
  const loginRes = await request.post('/auth/login').send({
    email: adminEmail,
    password: 'SecurePass123!',
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.accessToken);

  // 3. Get /auth/me
  const meRes = await request
    .get('/auth/me')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.id, adminId);

  // 4. Create employee
  const employeeRes = await request
    .post('/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'E2E Employee',
      email: employeeEmail,
      password: 'SecurePass123!',
    });
  assert.equal(employeeRes.status, 201, `Create employee failed: ${employeeRes.text}`);
  const employeeId = employeeRes.body.id;

  // 5. Create client
  const clientRes = await request
    .post('/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `E2E Client ${unique}`,
      email: `client-e2e-${unique}@example.com`,
    });
  assert.equal(clientRes.status, 201, `Create client failed: ${clientRes.text}`);
  const clientId = clientRes.body.id;

  // 6. List clients
  const listClientsRes = await request
    .get('/clients')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listClientsRes.status, 200);
  assert.ok(listClientsRes.body.total >= 1);

  // 7. Get client
  const getClientRes = await request
    .get(`/clients/${clientId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getClientRes.status, 200);
  assert.equal(getClientRes.body.id, clientId);

  // 8. Update client
  const updateClientRes = await request
    .post(`/clients/${clientId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Updated Client ${unique}`,
    });
  assert.equal(updateClientRes.status, 200);
  assert.equal(updateClientRes.body.name, `Updated Client ${unique}`);

  // 9. Create client user
  const clientUserRes = await request
    .post('/client-users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'E2E Client User',
      email: clientUserEmail,
      password: 'SecurePass123!',
      clientId,
    });
  assert.equal(clientUserRes.status, 201, `Create client user failed: ${clientUserRes.text}`);
  const clientUserId = clientUserRes.body.id;

  // 10. List users
  const listUsersRes = await request
    .get('/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listUsersRes.status, 200);
  assert.ok(listUsersRes.body.total >= 3); // admin, employee, client user

  // 11. Get user
  const getUserRes = await request
    .get(`/users/${employeeId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getUserRes.status, 200);
  assert.equal(getUserRes.body.id, employeeId);

  // 12. Create stream
  const streamRes = await request
    .post(`/clients/${clientId}/streams`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `E2E Stream ${unique}`,
      description: 'E2E test stream',
    });
  assert.equal(streamRes.status, 201, `Create stream failed: ${streamRes.text}`);
  const streamId = streamRes.body.id;

  // 13. List streams
  const listStreamsRes = await request
    .get(`/clients/${clientId}/streams`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listStreamsRes.status, 200);
  assert.ok(listStreamsRes.body.total >= 1);

  // 14. Get stream
  const getStreamRes = await request
    .get(`/streams/${streamId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getStreamRes.status, 200);
  assert.equal(getStreamRes.body.id, streamId);

  // 15. Create subject
  const subjectRes = await request
    .post(`/clients/${clientId}/subjects`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `E2E Subject ${unique}`,
      description: 'E2E test subject',
    });
  assert.equal(subjectRes.status, 201, `Create subject failed: ${subjectRes.text}`);
  const subjectId = subjectRes.body.id;

  // 16. List subjects
  const listSubjectsRes = await request
    .get(`/clients/${clientId}/subjects`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listSubjectsRes.status, 200);
  assert.ok(listSubjectsRes.body.total >= 1);

  // 17. Get subject
  const getSubjectRes = await request
    .get(`/subjects/${subjectId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getSubjectRes.status, 200);
  assert.equal(getSubjectRes.body.id, subjectId);

  // 18. Get taxonomy (priority, status)
  const priorityRes = await request
    .get('/taxonomy/priority')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(priorityRes.status, 200);
  assert.ok(priorityRes.body.length > 0);
  const priorityId = priorityRes.body[0].id;

  const statusRes = await request
    .get('/taxonomy/status')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(statusRes.status, 200);
  assert.ok(statusRes.body.length > 0);
  const statusId = statusRes.body.find((s: any) => !s.isClosed)?.id ?? statusRes.body[0].id;

  // 19. Create project
  const projectRes = await request
    .post('/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      clientId,
      name: `E2E Project ${unique}`,
      description: 'E2E test project',
    });
  assert.equal(projectRes.status, 201, `Create project failed: ${projectRes.text}`);
  const projectId = projectRes.body.id;

  // 20. List projects
  const listProjectsRes = await request
    .get('/projects')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listProjectsRes.status, 200);
  assert.ok(listProjectsRes.body.total >= 1);

  // 21. Get project
  const getProjectRes = await request
    .get(`/projects/${projectId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getProjectRes.status, 200);
  assert.equal(getProjectRes.body.id, projectId);

  // 22. Add project member (admin)
  const adminMemberRes = await request
    .post(`/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: adminId,
      role: 'MANAGER',
      canRaise: true,
      canBeAssigned: true,
    });
  assert.equal(adminMemberRes.status, 201, `Add admin member failed: ${adminMemberRes.text}`);

  // 23. Add project member (employee)
  const employeeMemberRes = await request
    .post(`/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: employeeId,
      role: 'MEMBER',
      canRaise: true,
      canBeAssigned: true,
    });
  assert.equal(employeeMemberRes.status, 201, `Add employee member failed: ${employeeMemberRes.text}`);

  // 24. List project members
  const listMembersRes = await request
    .get(`/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listMembersRes.status, 200);
  assert.ok(listMembersRes.body.length >= 2);

  // 25. Create ticket
  const ticketRes = await request
    .post('/tickets')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      projectId,
      streamId,
      subjectId,
      priorityId,
      statusId,
      title: `E2E Ticket ${unique}`,
      descriptionMd: 'E2E test ticket description',
      assignedToUserId: employeeId,
    });
  assert.equal(ticketRes.status, 201, `Create ticket failed: ${ticketRes.text}`);
  const ticketId = ticketRes.body.id;

  // 26. List tickets
  const listTicketsRes = await request
    .get('/tickets')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listTicketsRes.status, 200);
  assert.ok(listTicketsRes.body.total >= 1);

  // 27. Get ticket
  const getTicketRes = await request
    .get(`/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(getTicketRes.status, 200);
  assert.equal(getTicketRes.body.id, ticketId);

  // 28. Update ticket
  const newStatusId = statusRes.body.find((s: any) => s.id !== statusId)?.id ?? statusId;
  const updateTicketRes = await request
    .post(`/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      statusId: newStatusId,
    });
  assert.equal(updateTicketRes.status, 200, `Update ticket failed: ${updateTicketRes.text}`);
  assert.equal(updateTicketRes.body.statusId, newStatusId);

  // 29. Create comment (admin - internal)
  const adminCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      visibility: 'INTERNAL',
      bodyMd: 'Internal admin comment',
    });
  assert.equal(adminCommentRes.status, 201, `Create admin comment failed: ${adminCommentRes.text}`);

  // 30. List comments (admin - should see all)
  const adminCommentsRes = await request
    .get(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(adminCommentsRes.status, 200);
  assert.ok(adminCommentsRes.body.length >= 1);
  assert.ok(adminCommentsRes.body.some((c: any) => c.visibility === 'INTERNAL'));

  // 31. Client login
  const clientLoginRes = await request.post('/auth/login').send({
    email: clientUserEmail,
    password: 'SecurePass123!',
  });
  assert.equal(clientLoginRes.status, 200);
  const clientToken = clientLoginRes.body.accessToken;

  // 32. Client lists tickets (should see their own)
  const clientTicketsRes = await request
    .get('/tickets')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientTicketsRes.status, 200);
  assert.ok(clientTicketsRes.body.total >= 1);

  // 33. Client creates public comment
  const clientCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      visibility: 'PUBLIC',
      bodyMd: 'Public client comment',
    });
  assert.equal(clientCommentRes.status, 201, `Create client comment failed: ${clientCommentRes.text}`);

  // 34. Client cannot create internal comment
  const forbiddenCommentRes = await request
    .post(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      visibility: 'INTERNAL',
      bodyMd: 'Should fail',
    });
  assert.equal(forbiddenCommentRes.status, 403, 'Client should not be able to create internal comments');

  // 35. Client lists comments (should only see public)
  const clientCommentsRes = await request
    .get(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientCommentsRes.status, 200);
  assert.ok(clientCommentsRes.body.every((c: any) => c.visibility === 'PUBLIC'));

  // 36. Employee login
  const employeeLoginRes = await request.post('/auth/login').send({
    email: employeeEmail,
    password: 'SecurePass123!',
  });
  assert.equal(employeeLoginRes.status, 200);
  const employeeToken = employeeLoginRes.body.accessToken;

  // 37. Employee lists tickets (should see assigned/raised)
  const employeeTicketsRes = await request
    .get('/tickets')
    .set('Authorization', `Bearer ${employeeToken}`);
  assert.equal(employeeTicketsRes.status, 200);
  assert.ok(employeeTicketsRes.body.total >= 1);

  // 38. Employee can see all comments
  const employeeCommentsRes = await request
    .get(`/tickets/${ticketId}/comments`)
    .set('Authorization', `Bearer ${employeeToken}`);
  assert.equal(employeeCommentsRes.status, 200);
  assert.ok(employeeCommentsRes.body.some((c: any) => c.visibility === 'INTERNAL'));

  // 39. Delete ticket (admin)
  const deleteTicketRes = await request
    .delete(`/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(deleteTicketRes.status, 204, `Delete ticket failed: ${deleteTicketRes.text}`);

  // 40. Verify ticket is deleted (soft delete)
  const deletedTicketRes = await request
    .get(`/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(deletedTicketRes.status, 404, 'Deleted ticket should not be accessible');
});

test('E2E: Authorization and access control', async () => {
  const unique = Date.now();
  const adminEmail = `admin-auth-${unique}@example.com`;
  const employeeEmail = `employee-auth-${unique}@example.com`;
  const clientUserEmail = `client-auth-${unique}@example.com`;

  // Create admin
  const signupRes = await request.post('/auth/signup').send({
    organizationName: `Auth Test Org ${unique}`,
    fullName: 'Auth Admin',
    email: adminEmail,
    password: 'SecurePass123!',
  });
  const adminToken = signupRes.body.accessToken;
  const adminId = signupRes.body.user.id;

  // Create employee
  const employeeRes = await request
    .post('/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'Auth Employee',
      email: employeeEmail,
      password: 'SecurePass123!',
    });
  const employeeId = employeeRes.body.id;
  const employeeToken = (await request.post('/auth/login').send({
    email: employeeEmail,
    password: 'SecurePass123!',
  })).body.accessToken;

  // Create client and client user
  const clientRes = await request
    .post('/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Auth Client ${unique}`,
      email: `client-auth-${unique}@example.com`,
    });
  const clientId = clientRes.body.id;

  const clientUserRes = await request
    .post('/client-users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'Auth Client User',
      email: clientUserEmail,
      password: 'SecurePass123!',
      clientId,
    });
  const clientToken = (await request.post('/auth/login').send({
    email: clientUserEmail,
    password: 'SecurePass123!',
  })).body.accessToken;

  // Employee cannot create employees
  const employeeCreateEmployeeRes = await request
    .post('/employees')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({
      fullName: 'Should Fail',
      email: `should-fail-${unique}@example.com`,
      password: 'SecurePass123!',
    });
  assert.equal(employeeCreateEmployeeRes.status, 403, 'Employee should not create employees');

  // Client cannot list users
  const clientListUsersRes = await request
    .get('/users')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientListUsersRes.status, 403, 'Client should not list users');

  // Client cannot view other users
  const clientGetUserRes = await request
    .get(`/users/${adminId}`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(clientGetUserRes.status, 403, 'Client should not view other users');

  // Employee cannot view other users (except self)
  const employeeGetUserRes = await request
    .get(`/users/${adminId}`)
    .set('Authorization', `Bearer ${employeeToken}`);
  assert.equal(employeeGetUserRes.status, 403, 'Employee should not view other users');

  // Employee can view self
  const employeeGetSelfRes = await request
    .get(`/users/${employeeId}`)
    .set('Authorization', `Bearer ${employeeToken}`);
  assert.equal(employeeGetSelfRes.status, 200, 'Employee should view self');
});

