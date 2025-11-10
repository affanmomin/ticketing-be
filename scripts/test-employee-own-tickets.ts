/*
Test that employee only sees their own assigned/raised tickets
*/
import 'dotenv/config';
import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  const employeeEmail = 'umamashaikh912@gmail.com';
  const employeePassword = 'Soccer@12';

  const http = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true,
  });

  console.log('Testing employee sees only their assigned/raised tickets...\n');

  // Login as employee
  const loginRes = await http.post('/auth/login', {
    email: employeeEmail,
    password: employeePassword,
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.status, loginRes.data);
    return;
  }

  http.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.accessToken}`;

  // Get tickets
  const ticketsRes = await http.get('/tickets');

  if (ticketsRes.status !== 200) {
    console.error('Failed to get tickets:', ticketsRes.status, ticketsRes.data);
    return;
  }

  console.log('Employee tickets:');
  console.log(`Total: ${ticketsRes.data.total}`);
  console.log('\nTickets:');
  ticketsRes.data.data.forEach((ticket: any) => {
    console.log(`  - ${ticket.title}`);
    console.log(`    Assigned to: ${ticket.assignedToEmail || 'unassigned'}`);
    console.log(`    Raised by: ${ticket.raisedByEmail}`);
  });

  if (ticketsRes.data.total === 1 && ticketsRes.data.data[0].title === 'sxac') {
    console.log('\n✅ SUCCESS! Employee sees only their assigned ticket (sxac)');
  } else {
    console.log('\n⚠️  Employee ticket count:', ticketsRes.data.total);
    console.log('Expected: 1 ticket (sxac)');
  }
}

main().catch(console.error);

