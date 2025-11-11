/*
Test script to verify email notification when a ticket is created for a user.
This script creates a ticket assigned to an employee and verifies the email is sent.
*/
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
// Use TEST_EMAIL if provided, otherwise use a unique email based on timestamp
// For testing, you can set TEST_EMAIL env var to your actual email to receive the test email
const TEST_EMAIL = process.env.TEST_EMAIL || `test+${Date.now()}@example.com`;

async function main() {
  console.log(`\n🧪 Testing Ticket Creation Email Notification`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}\n`);

  const http: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true,
  });

  const unique = Date.now();

  try {
    // 1. Create admin user
    console.log('1️⃣  Creating admin user...');
    const adminSignup = await http.post('/auth/signup', {
      organizationName: `Test Org ${unique}`,
      fullName: 'Admin User',
      email: `admin+${unique}@example.com`,
      password: 'SecurePass123!',
    });

    if (adminSignup.status !== 200) {
      console.error('❌ Admin signup failed:', adminSignup.status, adminSignup.data);
      return;
    }

    const adminToken = adminSignup.data.accessToken;
    const adminId = adminSignup.data.user.id;
    http.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    console.log('✅ Admin created:', adminId);

    // 2. Create employee (this will be the assigned user)
    console.log('\n2️⃣  Creating employee user...');
    // Use unique email to avoid conflicts
    const employeeEmail = TEST_EMAIL.includes('@example.com') ? TEST_EMAIL : `${TEST_EMAIL.split('@')[0]}+${unique}@${TEST_EMAIL.split('@')[1] || 'example.com'}`;

    const employeeRes = await http.post('/employees', {
      fullName: 'Test Employee',
      email: employeeEmail,
      password: 'SecurePass123!',
    });

    if (employeeRes.status !== 201) {
      console.error('❌ Employee creation failed:', employeeRes.status, employeeRes.data);
      console.log('💡 Tip: If email is already in use, set TEST_EMAIL env var to a different email');
      return;
    }

    const employeeId = employeeRes.data.id;
    console.log('✅ Employee created:', employeeId, `(${employeeEmail})`);

    // 3. Create client
    console.log('\n3️⃣  Creating client...');
    const clientRes = await http.post('/clients', {
      name: `Test Client ${unique}`,
      email: `client+${unique}@example.com`,
    });

    if (clientRes.status !== 201) {
      console.error('❌ Client creation failed:', clientRes.status, clientRes.data);
      return;
    }

    const clientId = clientRes.data.id;
    console.log('✅ Client created:', clientId);

    // 4. Create project
    console.log('\n4️⃣  Creating project...');
    const projectRes = await http.post('/projects', {
      clientId,
      name: `Test Project ${unique}`,
      description: 'Test project for email notification',
    });

    if (projectRes.status !== 201) {
      console.error('❌ Project creation failed:', projectRes.status, projectRes.data);
      return;
    }

    const projectId = projectRes.data.id;
    console.log('✅ Project created:', projectId);

    // 5. Get default priority and status
    console.log('\n5️⃣  Fetching default priority and status...');
    const priorityRes = await http.get('/taxonomy/priority');
    const statusRes = await http.get('/taxonomy/status');

    if (priorityRes.status !== 200 || statusRes.status !== 200) {
      console.error('❌ Failed to fetch priority/status:', priorityRes.status, statusRes.status);
      return;
    }

    const priorityId = priorityRes.data[0]?.id;
    const statusId = statusRes.data[0]?.id;

    if (!priorityId || !statusId) {
      console.error('❌ No default priority or status found');
      return;
    }

    console.log('✅ Priority:', priorityId);
    console.log('✅ Status:', statusId);

    // 6. Create stream and subject for the project
    console.log('\n6️⃣  Creating stream and subject...');
    const streamRes = await http.post(`/projects/${projectId}/streams`, {
      name: `Test Stream ${unique}`,
      description: 'Test stream',
    });

    const subjectRes = await http.post(`/projects/${projectId}/subjects`, {
      name: `Test Subject ${unique}`,
      description: 'Test subject',
    });

    if (streamRes.status !== 201 || subjectRes.status !== 201) {
      console.error('❌ Stream/Subject creation failed:', streamRes.status, subjectRes.status);
      return;
    }

    const streamId = streamRes.data.id;
    const subjectId = subjectRes.data.id;
    console.log('✅ Stream created:', streamId);
    console.log('✅ Subject created:', subjectId);

    // 7. Add admin as project member (can raise tickets)
    console.log('\n7️⃣  Adding admin to project...');
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

    console.log('✅ Admin added to project');

    // 8. Add employee as project member (can be assigned)
    console.log('\n8️⃣  Adding employee to project...');
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

    console.log('✅ Employee added to project');

    // 9. Create ticket assigned to employee (THIS SHOULD TRIGGER EMAIL)
    console.log('\n9️⃣  Creating ticket assigned to employee...');
    console.log('   📧 This should trigger an email to:', employeeEmail);

    const ticketRes = await http.post('/tickets', {
      projectId,
      streamId,
      subjectId,
      priorityId,
      statusId,
      title: `Test Ticket ${unique} - Email Notification Test`,
      descriptionMd: 'This is a test ticket to verify email notification functionality. If you received this email, the feature is working correctly!',
      assignedToUserId: employeeId, // This should trigger the email
    });

    if (ticketRes.status !== 201) {
      console.error('❌ Ticket creation failed:', ticketRes.status, ticketRes.data);
      return;
    }

    const ticketId = ticketRes.data.id;
    console.log('✅ Ticket created:', ticketId);
    console.log('   Title:', ticketRes.data.title);
    console.log('   Assigned to:', ticketRes.data.assignedToName, `(${ticketRes.data.assignedToEmail})`);

    // 10. Wait a moment for email to be sent
    console.log('\n⏳ Waiting 2 seconds for email to be sent...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 11. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Ticket created successfully');
    console.log(`✅ Ticket ID: ${ticketId}`);
    console.log(`✅ Assigned to: ${ticketRes.data.assignedToName} (${ticketRes.data.assignedToEmail})`);
    console.log(`✅ Project: ${ticketRes.data.projectName}`);
    console.log(`✅ Raised by: ${ticketRes.data.raisedByName}`);
    console.log('\n📧 Please check the inbox for:', employeeEmail);
    console.log('   Subject: "New Ticket Assigned: Test Ticket ..."');
    console.log('\n💡 Note: Email sending is asynchronous and may take a few seconds.');
    console.log('   Check your email inbox (and spam folder) to verify receipt.');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

main().catch(console.error);

