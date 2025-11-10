/*
Check ticket assignments to understand who should see what
*/
import 'dotenv/config';
import { pool } from '../src/db/pool';

async function main() {
  const employeeEmail = process.argv[2] || 'umamashaikh912@gmail.com';

  const client = await pool.connect();
  try {
    // Find the employee
    const { rows: users } = await client.query(
      'SELECT id, email, full_name FROM app_user WHERE email = $1',
      [employeeEmail]
    );

    if (users.length === 0) {
      console.error('User not found');
      return;
    }

    const employee = users[0];
    console.log('\n=== EMPLOYEE INFO ===');
    console.log('ID:', employee.id);
    console.log('Email:', employee.email);
    console.log('Name:', employee.full_name);

    // Get all tickets with assignment info
    const { rows: tickets } = await client.query(
      `SELECT 
        t.id,
        t.title,
        t.assigned_to_user_id,
        assigned_to.email as assigned_to_email,
        t.raised_by_user_id,
        raised_by.email as raised_by_email,
        p.name as project_name
      FROM ticket t
      JOIN project p ON p.id = t.project_id
      JOIN app_user raised_by ON raised_by.id = t.raised_by_user_id
      LEFT JOIN app_user assigned_to ON assigned_to.id = t.assigned_to_user_id
      WHERE t.is_deleted = false
      ORDER BY t.created_at DESC`
    );

    console.log('\n=== ALL TICKETS ===');
    tickets.forEach((t: any) => {
      const isAssignedTo = t.assigned_to_user_id === employee.id;
      const isRaisedBy = t.raised_by_user_id === employee.id;
      const shouldSee = isAssignedTo || isRaisedBy;
      
      console.log(`\n${shouldSee ? '✓' : '✗'} ${t.title} (${t.project_name})`);
      console.log(`  Raised by: ${t.raised_by_email}${isRaisedBy ? ' ← EMPLOYEE' : ''}`);
      console.log(`  Assigned to: ${t.assigned_to_email || 'unassigned'}${isAssignedTo ? ' ← EMPLOYEE' : ''}`);
      console.log(`  Should employee see: ${shouldSee ? 'YES' : 'NO'}`);
    });

    // Simulate new query
    const { rows: employeeTickets } = await client.query(
      `SELECT t.id, t.title, p.name as project_name
       FROM ticket t
       JOIN project p ON p.id = t.project_id
       WHERE t.is_deleted = false
         AND (t.assigned_to_user_id = $1 OR t.raised_by_user_id = $1)
       ORDER BY t.created_at DESC`,
      [employee.id]
    );

    console.log('\n=== TICKETS EMPLOYEE SHOULD SEE (NEW LOGIC) ===');
    console.log(`Total: ${employeeTickets.length} tickets`);
    employeeTickets.forEach((t: any) => {
      console.log(`  - ${t.title} (${t.project_name})`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

