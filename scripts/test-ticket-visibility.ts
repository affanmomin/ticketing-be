/*
Test ticket visibility based on user roles and project membership.
Tests the fix for employee ticket visibility.
*/
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log(`Testing ticket visibility at: ${API_BASE_URL}`);

  const http: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true,
  });

  const unique = Date.now();

  // 1. Create admin user
  console.log('\n1. Creating admin user...');
  const adminSignup = await http.post('/auth/signup', {
    organizationName: `Test Org ${unique}`,
    fullName: 'Admin User',
    email: `admin+${unique}@example.com`,
    password: 'SecurePass123!',
  });

  if (adminSignup.status !== 200) {
    console.error('Admin signup failed:', adminSignup.status, adminSignup.data);
    return;
  }

  const adminToken = adminSignup.data.accessToken;
  const adminId = adminSignup.data.user.id;
  http.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

  // 2. Create employee
  console.log('2. Creating employee...');
  const employeeRes = await http.post('/employees', {
    fullName: 'Test Employee',
    email: `employee+${unique}@example.com`,
    password: 'SecurePass123!',
  });

  if (employeeRes.status !== 201) {
    console.error('Employee creation failed:', employeeRes.status, employeeRes.data);
    return;
  }

  const employeeId = employeeRes.data.id;

  // 3. Create client
  console.log('3. Creating client...');
  const clientRes = await http.post('/clients', {
    name: `Test Client ${unique}`,
    email: `client+${unique}@example.com`,
  });

  if (clientRes.status !== 201) {
    console.error('Client creation failed:', clientRes.status, clientRes.data);
    return;
  }

  const clientId = clientRes.data.id;

  // 4. Create two projects
  console.log('4. Creating two projects...');
  const project1Res = await http.post('/projects', {
    clientId,
    name: `Project 1 ${unique}`,
    description: 'First test project',
  });

  const project2Res = await http.post('/projects', {
    clientId,
    name: `Project 2 ${unique}`,
    description: 'Second test project',
  });

  if (project1Res.status !== 201 || project2Res.status !== 201) {
    console.error('Project creation failed');
    return;
  }

  const project1Id = project1Res.data.id;
  const project2Id = project2Res.data.id;

  // 5. Create taxonomy (stream, subject)
  console.log('5. Creating taxonomy...');
  const streamRes = await http.post(`/clients/${clientId}/streams`, {
    name: `Test Stream ${unique}`,
    description: 'Test stream',
  });

  const subjectRes = await http.post(`/clients/${clientId}/subjects`, {
    name: `Test Subject ${unique}`,
    description: 'Test subject',
  });

  if (streamRes.status !== 201 || subjectRes.status !== 201) {
    console.error('Taxonomy creation failed');
    return;
  }

  const streamId = streamRes.data.id;
  const subjectId = subjectRes.data.id;

  // Get priority and status
  const priorityRes = await http.get('/taxonomy/priority');
  const statusRes = await http.get('/taxonomy/status');
  const priorityId = priorityRes.data[0].id;
  const statusId = statusRes.data.find((s: any) => !s.isClosed)?.id ?? statusRes.data[0].id;

  // 6. Add admin as member of both projects
  console.log('6. Adding admin to both projects...');
  const adminMember1Res = await http.post(`/projects/${project1Id}/members`, {
    userId: adminId,
    role: 'MANAGER',
    canRaise: true,
    canBeAssigned: true,
  });

  const adminMember2Res = await http.post(`/projects/${project2Id}/members`, {
    userId: adminId,
    role: 'MANAGER',
    canRaise: true,
    canBeAssigned: true,
  });

  if (adminMember1Res.status !== 201 || adminMember2Res.status !== 201) {
    console.error('Adding admin to projects failed');
    return;
  }

  // Add employee to only Project 1
  console.log('7. Adding employee to Project 1 only...');
  const employeeMemberRes = await http.post(`/projects/${project1Id}/members`, {
    userId: employeeId,
    role: 'MEMBER',
    canRaise: true,
    canBeAssigned: true,
  });

  if (employeeMemberRes.status !== 201) {
    console.error('Adding employee to project failed:', employeeMemberRes.status, employeeMemberRes.data);
    return;
  }

  // 8. Create tickets in both projects - assign one to employee
  console.log('8. Creating tickets in both projects...');
  const ticket1Res = await http.post('/tickets', {
    projectId: project1Id,
    streamId,
    subjectId,
    priorityId,
    statusId,
    title: `Ticket in Project 1 ${unique}`,
    descriptionMd: 'This ticket is in project 1',
    assignedToUserId: employeeId, // Assign to employee
  });

  const ticket2Res = await http.post('/tickets', {
    projectId: project2Id,
    streamId,
    subjectId,
    priorityId,
    statusId,
    title: `Ticket in Project 2 ${unique}`,
    descriptionMd: 'This ticket is in project 2',
    // Not assigned to employee
  });

  if (ticket1Res.status !== 201) {
    console.error('Ticket 1 creation failed:', ticket1Res.status, ticket1Res.data);
    return;
  }
  if (ticket2Res.status !== 201) {
    console.error('Ticket 2 creation failed:', ticket2Res.status, ticket2Res.data);
    return;
  }

  const ticket1Id = ticket1Res.data.id;
  const ticket2Id = ticket2Res.data.id;

  // 9. Test admin can see all tickets
  console.log('9. Testing admin can see all tickets...');
  const adminTicketsRes = await http.get('/tickets');
  if (adminTicketsRes.status !== 200) {
    console.error('Admin tickets list failed:', adminTicketsRes.status, adminTicketsRes.data);
    return;
  }

  const adminTicketIds = adminTicketsRes.data.data.map((t: any) => t.id);
  console.log(`Admin sees ${adminTicketIds.length} tickets:`, adminTicketIds);

  if (!adminTicketIds.includes(ticket1Id) || !adminTicketIds.includes(ticket2Id)) {
    console.error('FAIL: Admin should see both tickets');
    return;
  }

  // 10. Login as employee
  console.log('10. Logging in as employee...');
  const employeeLoginRes = await http.post('/auth/login', {
    email: `employee+${unique}@example.com`,
    password: 'SecurePass123!',
  });

  if (employeeLoginRes.status !== 200) {
    console.error('Employee login failed:', employeeLoginRes.status, employeeLoginRes.data);
    return;
  }

  const employeeToken = employeeLoginRes.data.accessToken;
  http.defaults.headers.common['Authorization'] = `Bearer ${employeeToken}`;

  // 11. Test employee can only see Project 1 tickets
  console.log('11. Testing employee ticket visibility...');
  const employeeTicketsRes = await http.get('/tickets');
  if (employeeTicketsRes.status !== 200) {
    console.error('Employee tickets list failed:', employeeTicketsRes.status, employeeTicketsRes.data);
    return;
  }

  const employeeTicketIds = employeeTicketsRes.data.data.map((t: any) => t.id);
  console.log(`Employee sees ${employeeTicketIds.length} tickets:`, employeeTicketIds);

  // Employee should see ticket1 (assigned to them) but not ticket2
  if (!employeeTicketIds.includes(ticket1Id)) {
    console.error('FAIL: Employee should see ticket assigned to them');
    return;
  }

  if (employeeTicketIds.includes(ticket2Id)) {
    console.error('FAIL: Employee should NOT see ticket not assigned to them');
    return;
  }

  // 12. Test employee can access individual ticket assigned to them
  console.log('12. Testing employee can access individual ticket assigned to them...');
  const employeeTicket1Res = await http.get(`/tickets/${ticket1Id}`);
  if (employeeTicket1Res.status !== 200) {
    console.error('Employee access to their assigned ticket failed:', employeeTicket1Res.status, employeeTicket1Res.data);
    return;
  }

  // 13. Test employee cannot access ticket not assigned/raised by them
  console.log('13. Testing employee cannot access ticket not assigned to them...');
  const employeeTicket2Res = await http.get(`/tickets/${ticket2Id}`);
  if (employeeTicket2Res.status === 200) {
    console.error('FAIL: Employee should not be able to access ticket not assigned to them');
    return;
  }

  console.log('\n✅ All tests passed! Ticket visibility is working correctly.');
  console.log('✅ Admin can see all organization tickets');
  console.log('✅ Employee can only see tickets assigned to them or raised by them');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
