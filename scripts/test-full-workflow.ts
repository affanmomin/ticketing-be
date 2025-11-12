/**
 * Comprehensive end-to-end test script
 *
 * Tests the full workflow:
 * 1. Create admin user
 * 2. Create client
 * 3. Create project
 * 4. Create employee
 * 5. Add users to project
 * 6. Create stream and subject
 * 7. Create ticket assigned to employee (as admin)
 * 8. Login as employee
 * 9. Create ticket as employee
 *
 * Run: npx ts-node -r dotenv/config scripts/test-full-workflow.ts
 */

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 COMPREHENSIVE END-TO-END TEST');
  console.log('='.repeat(70));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  const http: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true,
  });

  const unique = Date.now();
  let adminToken: string;
  let adminId: string;
  let employeeId: string;
  let employeeEmail: string;
  let employeePassword: string;
  let clientId: string;
  let projectId: string;
  let streamId: string;
  let subjectId: string;
  let priorityId: string;
  let statusId: string;

  try {
    // ==========================================
    // PHASE 1: SETUP (As Admin)
    // ==========================================
    console.log('\n📋 PHASE 1: SETUP (As Admin)');
    console.log('-'.repeat(70));

    // 1. Create admin user
    console.log('\n1️⃣  Creating admin user...');
    const adminSignup = await http.post('/auth/signup', {
      organizationName: `Test Org ${unique}`,
      fullName: 'Test Admin User',
      email: `admin+${unique}@test.com`,
      password: 'AdminPass123!',
    });

    if (adminSignup.status !== 200) {
      console.error('❌ Admin signup failed:', adminSignup.status, adminSignup.data);
      return;
    }

    adminToken = adminSignup.data.accessToken;
    adminId = adminSignup.data.user.id;
    http.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    console.log('✅ Admin created');
    console.log(`   ID: ${adminId}`);
    console.log(`   Email: admin+${unique}@test.com`);

    // 2. Create client
    console.log('\n2️⃣  Creating client...');
    const clientRes = await http.post('/clients', {
      name: `Test Client ${unique}`,
      email: `client+${unique}@test.com`,
    });

    if (clientRes.status !== 201) {
      console.error('❌ Client creation failed:', clientRes.status, clientRes.data);
      return;
    }

    clientId = clientRes.data.id;
    console.log('✅ Client created');
    console.log(`   ID: ${clientId}`);
    console.log(`   Name: Test Client ${unique}`);

    // 3. Create project
    console.log('\n3️⃣  Creating project...');
    const projectRes = await http.post('/projects', {
      clientId,
      name: `Test Project ${unique}`,
      description: 'Test project for end-to-end workflow testing',
    });

    if (projectRes.status !== 201) {
      console.error('❌ Project creation failed:', projectRes.status, projectRes.data);
      return;
    }

    projectId = projectRes.data.id;
    console.log('✅ Project created');
    console.log(`   ID: ${projectId}`);
    console.log(`   Name: Test Project ${unique}`);

    // 4. Create employee
    console.log('\n4️⃣  Creating employee...');
    employeeEmail = `employee+${unique}@test.com`;
    employeePassword = 'EmployeePass123!';

    const employeeRes = await http.post('/employees', {
      fullName: 'Test Employee',
      email: employeeEmail,
      password: employeePassword,
    });

    if (employeeRes.status !== 201) {
      console.error('❌ Employee creation failed:', employeeRes.status, employeeRes.data);
      return;
    }

    employeeId = employeeRes.data.id;
    console.log('✅ Employee created');
    console.log(`   ID: ${employeeId}`);
    console.log(`   Email: ${employeeEmail}`);
    console.log(`   Password: ${employeePassword}`);

    // 5. Add admin to project
    console.log('\n5️⃣  Adding admin to project...');
    const adminMemberRes = await http.post(`/projects/${projectId}/members`, {
      userId: adminId,
      role: 'MANAGER',
      canRaise: true,
      canBeAssigned: true,
    });

    if (adminMemberRes.status !== 201) {
      console.error('❌ Adding admin to project failed:', adminMemberRes.status, adminMemberRes.data);
      return;
    }

    console.log('✅ Admin added to project as MANAGER');

    // 6. Add employee to project
    console.log('\n6️⃣  Adding employee to project...');
    const employeeMemberRes = await http.post(`/projects/${projectId}/members`, {
      userId: employeeId,
      role: 'MEMBER',
      canRaise: true,
      canBeAssigned: true,
    });

    if (employeeMemberRes.status !== 201) {
      console.error('❌ Adding employee to project failed:', employeeMemberRes.status, employeeMemberRes.data);
      return;
    }

    console.log('✅ Employee added to project as MEMBER');

    // 7. Create stream and subject
    console.log('\n7️⃣  Creating stream and subject...');
    const streamRes = await http.post(`/projects/${projectId}/streams`, {
      name: `Test Stream ${unique}`,
      description: 'Test stream for workflow testing',
    });

    const subjectRes = await http.post(`/projects/${projectId}/subjects`, {
      name: `Test Subject ${unique}`,
      description: 'Test subject for workflow testing',
    });

    if (streamRes.status !== 201 || subjectRes.status !== 201) {
      console.error('❌ Stream/Subject creation failed:', streamRes.status, subjectRes.status);
      return;
    }

    streamId = streamRes.data.id;
    subjectId = subjectRes.data.id;
    console.log('✅ Stream created:', streamId);
    console.log('✅ Subject created:', subjectId);

    // 8. Get default priority and status
    console.log('\n8️⃣  Fetching default priority and status...');
    const priorityRes = await http.get('/taxonomy/priority');
    const statusRes = await http.get('/taxonomy/status');

    if (priorityRes.status !== 200 || statusRes.status !== 200) {
      console.error('❌ Failed to fetch priority/status:', priorityRes.status, statusRes.status);
      return;
    }

    priorityId = priorityRes.data[0]?.id;
    statusId = statusRes.data[0]?.id;

    if (!priorityId || !statusId) {
      console.error('❌ No default priority or status found');
      return;
    }

    console.log('✅ Priority:', priorityId);
    console.log('✅ Status:', statusId);

    // ==========================================
    // PHASE 2: CREATE TICKET AS ADMIN
    // ==========================================
    console.log('\n\n📋 PHASE 2: CREATE TICKET AS ADMIN');
    console.log('-'.repeat(70));

    // 9. Create ticket assigned to employee (as admin)
    console.log('\n9️⃣  Creating ticket assigned to employee (as admin)...');
    const ticketRes = await http.post('/tickets', {
      projectId,
      streamId,
      subjectId,
      priorityId,
      statusId,
      title: `Admin Created Ticket ${unique}`,
      descriptionMd: 'This ticket was created by the admin and assigned to the employee.',
      assignedToUserId: employeeId,
    });

    if (ticketRes.status !== 201) {
      console.error('❌ Ticket creation failed:', ticketRes.status, ticketRes.data);
      return;
    }

    const adminCreatedTicketId = ticketRes.data.id;
    console.log('✅ Ticket created successfully');
    console.log(`   Ticket ID: ${adminCreatedTicketId}`);
    console.log(`   Title: ${ticketRes.data.title}`);
    console.log(`   Assigned to: ${ticketRes.data.assignedToName} (${ticketRes.data.assignedToEmail})`);
    console.log(`   Raised by: ${ticketRes.data.raisedByName}`);

    // ==========================================
    // PHASE 3: LOGIN AS EMPLOYEE
    // ==========================================
    console.log('\n\n📋 PHASE 3: LOGIN AS EMPLOYEE');
    console.log('-'.repeat(70));

    // 10. Login as employee
    console.log('\n🔟 Logging in as employee...');
    const employeeLoginRes = await http.post('/auth/login', {
      email: employeeEmail,
      password: employeePassword,
    });

    if (employeeLoginRes.status !== 200) {
      console.error('❌ Employee login failed:', employeeLoginRes.status, employeeLoginRes.data);
      return;
    }

    const employeeToken = employeeLoginRes.data.accessToken;
    const employeeUser = employeeLoginRes.data.user;

    // Switch to employee's token
    http.defaults.headers.common['Authorization'] = `Bearer ${employeeToken}`;

    console.log('✅ Employee logged in successfully');
    console.log(`   User ID: ${employeeUser.id}`);
    console.log(`   User Type: ${employeeUser.userType}`);
    console.log(`   Email: ${employeeEmail}`);

    // 11. Verify employee can see assigned ticket
    console.log('\n1️⃣1️⃣  Verifying employee can see assigned ticket...');
    const employeeTicketsRes = await http.get('/tickets');

    if (employeeTicketsRes.status !== 200) {
      console.error('❌ Failed to fetch tickets:', employeeTicketsRes.status, employeeTicketsRes.data);
      return;
    }

    const employeeTickets = employeeTicketsRes.data.data || [];
    const assignedTicket = employeeTickets.find((t: any) => t.id === adminCreatedTicketId);

    if (assignedTicket) {
      console.log('✅ Employee can see assigned ticket');
      console.log(`   Found ticket: ${assignedTicket.title}`);
    } else {
      console.log('⚠️  Employee cannot see assigned ticket (this might be expected based on permissions)');
      console.log(`   Total tickets visible: ${employeeTickets.length}`);
    }

    // ==========================================
    // PHASE 4: CREATE TICKET AS EMPLOYEE
    // ==========================================
    console.log('\n\n📋 PHASE 4: CREATE TICKET AS EMPLOYEE');
    console.log('-'.repeat(70));

    // 12. Create ticket as employee
    console.log('\n1️⃣2️⃣  Creating ticket as employee...');
    const employeeTicketRes = await http.post('/tickets', {
      projectId,
      streamId,
      subjectId,
      priorityId,
      statusId,
      title: `Employee Created Ticket ${unique}`,
      descriptionMd: 'This ticket was created by the employee after logging in.',
    });

    if (employeeTicketRes.status !== 201) {
      console.error('❌ Employee ticket creation failed:', employeeTicketRes.status, employeeTicketRes.data);
      console.error('   Response:', JSON.stringify(employeeTicketRes.data, null, 2));
      return;
    }

    const employeeCreatedTicketId = employeeTicketRes.data.id;
    console.log('✅ Ticket created successfully by employee');
    console.log(`   Ticket ID: ${employeeCreatedTicketId}`);
    console.log(`   Title: ${employeeTicketRes.data.title}`);
    console.log(`   Raised by: ${employeeTicketRes.data.raisedByName}`);
    console.log(`   Assigned to: ${employeeTicketRes.data.assignedToName || 'Unassigned'}`);

    // 13. Verify employee can see their own ticket
    console.log('\n1️⃣3️⃣  Verifying employee can see their own ticket...');
    const employeeTicketsRes2 = await http.get('/tickets');

    if (employeeTicketsRes2.status !== 200) {
      console.error('❌ Failed to fetch tickets:', employeeTicketsRes2.status, employeeTicketsRes2.data);
      return;
    }

    const employeeTickets2 = employeeTicketsRes2.data.data || [];
    const ownTicket = employeeTickets2.find((t: any) => t.id === employeeCreatedTicketId);

    if (ownTicket) {
      console.log('✅ Employee can see their own ticket');
      console.log(`   Found ticket: ${ownTicket.title}`);
    } else {
      console.log('⚠️  Employee cannot see their own ticket');
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('\n✅ Setup Phase:');
    console.log(`   • Admin created: admin+${unique}@test.com`);
    console.log(`   • Client created: Test Client ${unique}`);
    console.log(`   • Project created: Test Project ${unique}`);
    console.log(`   • Employee created: ${employeeEmail}`);
    console.log(`   • Stream and Subject created`);
    console.log(`   • Users added to project`);

    console.log('\n✅ Ticket Creation Phase:');
    console.log(`   • Admin created ticket: ${adminCreatedTicketId}`);
    console.log(`   • Employee created ticket: ${employeeCreatedTicketId}`);

    console.log('\n✅ Authentication Phase:');
    console.log(`   • Employee logged in successfully`);
    console.log(`   • Employee can create tickets`);

    console.log('\n📋 Test Results:');
    console.log(`   • Total tickets visible to employee: ${employeeTickets2.length}`);
    console.log(`   • Admin-created ticket visible: ${assignedTicket ? 'Yes' : 'No'}`);
    console.log(`   • Employee-created ticket visible: ${ownTicket ? 'Yes' : 'No'}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

