/*
Change a user's role from ADMIN to EMPLOYEE or vice versa
Usage: pnpm ts-node scripts/change-user-role.ts <email> <new-role>
Example: pnpm ts-node scripts/change-user-role.ts uum@gmail.com EMPLOYEE
*/
import 'dotenv/config';
import { pool } from '../src/db/pool';

async function main() {
  const email = process.argv[2];
  const newRole = process.argv[3];

  if (!email || !newRole) {
    console.error('Usage: pnpm ts-node scripts/change-user-role.ts <email> <ADMIN|EMPLOYEE|CLIENT>');
    process.exit(1);
  }

  if (!['ADMIN', 'EMPLOYEE', 'CLIENT'].includes(newRole)) {
    console.error('Role must be ADMIN, EMPLOYEE, or CLIENT');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // Find user
    const { rows: users } = await client.query(
      'SELECT id, email, user_type FROM app_user WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    const user = users[0];
    console.log(`Current user: ${user.email}`);
    console.log(`Current role: ${user.user_type}`);
    console.log(`New role: ${newRole}`);

    // Update role
    await client.query(
      'UPDATE app_user SET user_type = $1 WHERE id = $2',
      [newRole, user.id]
    );

    console.log('✅ Role updated successfully!');
    console.log(`\nNote: The user needs to log out and log back in for the change to take effect.`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

