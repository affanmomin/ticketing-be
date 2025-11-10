/*
Test script to verify employee only sees tickets from their assigned projects
This uses your existing data and creates a new project to test with
*/
import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  const adminEmail = 'uum@gmail.com';
  const adminPassword = 'Soccer@12';
  const employeeEmail = 'umamashaikh912@gmail.com';
  const employeePassword = 'Soccer@12';

  const http: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true,
  });

  console.log('\n=== Testing Employee Ticket Visibility ===\n');

  // 1. Login as admin
  console.log('1. Logging in as admin...');
  const adminLoginRes = await http.post('/auth/login', {
    email: adminEmail,
    password: adminPassword,
  });

  if (adminLoginRes.status !== 200) {
    console.error('Admin login failed:', adminLoginRes.status, adminLoginRes.data);
    return;
  }

  const adminToken = adminLoginRes.data.accessToken;
  http.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

  // 2. Get existing client
  console.log('2. Getting existing client...');
  const clientsRes = await http.get('/clients');
  if (clientsRes.status !== 200 || clientsRes.data.data.length === 0) {
    console.error('No clients found. Please create a client first.');
    return;
  }
  const clientId = clientsRes.data.data[0].id;
  console.log(`   Using client: ${clientsRes.data.data[0].name} (${clientId})`);

  // 3. Create a new project (proj2)
  console.log('3. Creating a new project (proj2)...');
  const unique = Date.now();
  const newProjectRes = await http.post('/projects', {
    clientId,
    name: `Test Project 2 ${unique}`,
    description: 'Project employee is NOT a member of',
  });

  if (newProjectRes.status !== 201) {
    console.error('Project creation failed:', newProjectRes.status, newProjectRes.data);
    return;
  }

  const newProjectId = newProjectRes.data.id;
  console.log(`   Created project: ${newProjectRes.data.name} (${newProjectId})`);

  // 4. Add admin to the new project so they can create tickets
  console.log('4. Adding admin to new project...');
  const adminUserId = adminLoginRes.data.user.id;
  const adminMemberRes = await http.post(`/projects/${newProjectId}/members`, {
    userId: adminUserId,
    role: 'MANAGER',
    canRaise: true,
    canBeAssigned: true,
  });

  if (adminMemberRes.status !== 201) {
    console.error('Adding admin to project failed:', adminMemberRes.status, adminMemberRes.data);
    return;
  }

  // 5. Get taxonomy (stream, subject, priority, status)
  console.log('5. Getting taxonomy...');
  const streamsRes = await http.get(`/clients/${clientId}/streams`);
  const subjectsRes = await http.get(`/clients/${clientId}/subjects`);
  const priorityRes = await http.get('/taxonomy/priority');
  const statusRes = await http.get('/taxonomy/status');

  if (streamsRes.data.data.length === 0 || subjectsRes.data.data.length === 0) {
    console.error('No streams or subjects found. Please create them first.');
    return;
  }

  const streamId = streamsRes.data.data[0].id;
  const subjectId = subjectsRes.data.data[0].id;
  const priorityId = priorityRes.data[0].id;
  const statusId = statusRes.data.find((s: any) => !s.isClosed)?.id ?? statusRes.data[0].id;

  // 6. Create a ticket in the new project
  console.log('6. Creating a ticket in the new project...');
  const newTicketRes = await http.post('/tickets', {
    projectId: newProjectId,
    streamId,
    subjectId,
    priorityId,
    statusId,
    title: `Test Ticket - Employee Should NOT See This ${unique}`,
    descriptionMd: 'This ticket is in a project the employee is not a member of',
  });

  if (newTicketRes.status !== 201) {
    console.error('Ticket creation failed:', newTicketRes.status, newTicketRes.data);
    return;
  }

  const newTicketId = newTicketRes.data.id;
  console.log(`   Created ticket: ${newTicketRes.data.title}`);

  // 7. Get all tickets as admin
  console.log('\n7. Getting all tickets as admin...');
  const adminTicketsRes = await http.get('/tickets');
  const adminTicketCount = adminTicketsRes.data.total;
  console.log(`   Admin sees ${adminTicketCount} tickets`);

  // 8. Login as employee
  console.log('\n8. Logging in as employee...');
  const employeeLoginRes = await http.post('/auth/login', {
    email: employeeEmail,
    password: employeePassword,
  });

  if (employeeLoginRes.status !== 200) {
    console.error('Employee login failed:', employeeLoginRes.status, employeeLoginRes.data);
    return;
  }

  const employeeToken = employeeLoginRes.data.accessToken;
  http.defaults.headers.common['Authorization'] = `Bearer ${employeeToken}`;

  // 9. Get tickets as employee
  console.log('9. Getting tickets as employee...');
  const employeeTicketsRes = await http.get('/tickets');
  const employeeTicketCount = employeeTicketsRes.data.total;
  const employeeTicketIds = employeeTicketsRes.data.data.map((t: any) => t.id);

  console.log(`   Employee sees ${employeeTicketCount} tickets`);
  console.log(`   Tickets:`, employeeTicketsRes.data.data.map((t: any) => t.title));

  // 10. Verify employee doesn't see the new ticket
  console.log('\n10. Verifying visibility...');
  if (employeeTicketIds.includes(newTicketId)) {
    console.error('❌ FAIL: Employee can see ticket from project they are NOT a member of!');
    console.error(`   Employee should NOT see ticket: ${newTicketRes.data.title}`);
    return;
  }

  if (employeeTicketCount >= adminTicketCount) {
    console.error('❌ FAIL: Employee sees same or more tickets than admin!');
    return;
  }

  console.log('✅ PASS: Employee cannot see tickets from projects they are not a member of');
  console.log(`✅ Admin sees ${adminTicketCount} tickets, Employee sees ${employeeTicketCount} tickets`);

  // 11. Try to access the new ticket directly as employee
  console.log('\n11. Testing direct ticket access...');
  const employeeDirectAccessRes = await http.get(`/tickets/${newTicketId}`);

  if (employeeDirectAccessRes.status === 200) {
    console.error('❌ FAIL: Employee can directly access ticket from project they are not a member of!');
    return;
  }

  console.log('✅ PASS: Employee cannot directly access tickets from other projects');
  console.log(`   Status: ${employeeDirectAccessRes.status} (expected 403 or 404)`);

  console.log('\n✅ All tests passed! Employee ticket visibility is working correctly.');
}

main().catch(console.error);

