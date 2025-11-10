/*
Debug script to check employee ticket visibility
Run this to see what tickets and memberships exist for an employee user
*/
import 'dotenv/config';
import { pool } from '../src/db/pool';

async function main() {
  const employeeEmail = process.argv[2];
  
  if (!employeeEmail) {
    console.error('Usage: pnpm ts-node scripts/debug-employee-tickets.ts <employee-email>');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // Find the employee user
    const { rows: users } = await client.query(
      `SELECT id, email, full_name, user_type, organization_id, client_id 
       FROM app_user WHERE email = $1`,
      [employeeEmail]
    );

    if (users.length === 0) {
      console.error('Employee not found');
      return;
    }

    const user = users[0];
    console.log('\n=== USER INFO ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.full_name);
    console.log('Type:', user.user_type);
    console.log('Organization ID:', user.organization_id);
    console.log('Client ID:', user.client_id);

    // Get project memberships
    console.log('\n=== PROJECT MEMBERSHIPS ===');
    const { rows: memberships } = await client.query(
      `SELECT pm.*, p.name as project_name
       FROM project_member pm
       JOIN project p ON p.id = pm.project_id
       WHERE pm.user_id = $1`,
      [user.id]
    );

    console.log(`Found ${memberships.length} project memberships:`);
    memberships.forEach((m: any) => {
      console.log(`  - Project: ${m.project_name} (${m.project_id})`);
      console.log(`    Role: ${m.role}, Can Raise: ${m.can_raise}, Can Be Assigned: ${m.can_be_assigned}`);
    });

    // Get all tickets in the organization
    console.log('\n=== ALL TICKETS IN ORGANIZATION ===');
    const { rows: allTickets } = await client.query(
      `SELECT t.id, t.title, p.name as project_name, p.id as project_id, c.name as client_name
       FROM ticket t
       JOIN project p ON p.id = t.project_id
       JOIN client c ON c.id = p.client_id
       WHERE c.organization_id = $1 AND t.is_deleted = false
       ORDER BY t.created_at DESC`,
      [user.organization_id]
    );

    console.log(`Found ${allTickets.length} total tickets in organization:`);
    allTickets.forEach((t: any) => {
      const isMember = memberships.some((m: any) => m.project_id === t.project_id);
      console.log(`  ${isMember ? '✓' : '✗'} ${t.title} (${t.project_name})`);
    });

    // Simulate the query from listTickets for EMPLOYEE
    console.log('\n=== TICKETS QUERY SIMULATION (EMPLOYEE) ===');
    const { rows: employeeTickets } = await client.query(
      `SELECT t.id, t.title, p.name as project_name
       FROM ticket t
       JOIN project p ON p.id = t.project_id
       JOIN client c ON c.id = p.client_id
       WHERE t.is_deleted = false
         AND EXISTS (
           SELECT 1 FROM project_member pm
           WHERE pm.project_id = p.id AND pm.user_id = $1
         )
       ORDER BY t.created_at DESC`,
      [user.id]
    );

    console.log(`Employee should see ${employeeTickets.length} tickets:`);
    employeeTickets.forEach((t: any) => {
      console.log(`  - ${t.title} (${t.project_name})`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

