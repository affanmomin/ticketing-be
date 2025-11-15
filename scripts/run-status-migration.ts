/**
 * Run the status migration: Replace "Resolved" with "On Hold"
 * Updates existing databases to replace the "Resolved" status with "On Hold"
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/db/pool';

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting status migration: Replace "Resolved" with "On Hold"...\n');

    // Read the migration SQL file
    const migrationPath = join(__dirname, '../sql/006_replace_resolved_with_on_hold.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('');

    // Check current status values
    const { rows: statusRows } = await client.query(`
      SELECT id, name, is_closed, sequence, active
      FROM status
      WHERE name IN ('Resolved', 'On Hold')
      ORDER BY name
    `);

    console.log('📋 Current status values:');
    if (statusRows.length === 0) {
      console.log('   No "Resolved" or "On Hold" statuses found');
    } else {
      statusRows.forEach((row: any) => {
        console.log(`   - ${row.name} (ID: ${row.id}, Closed: ${row.is_closed}, Sequence: ${row.sequence}, Active: ${row.active})`);
      });
    }
    console.log('');

    // Check how many tickets use "Resolved"
    const { rows: ticketCountRows } = await client.query(`
      SELECT COUNT(*) as count
      FROM ticket t
      JOIN status s ON s.id = t.status_id
      WHERE s.name = 'Resolved' AND s.active = true
    `);

    const ticketCount = parseInt(ticketCountRows[0]?.count || '0', 10);
    console.log(`📊 Tickets currently using "Resolved" status: ${ticketCount}`);
    console.log('');

    console.log('▶️  Applying migration...\n');

    // Run the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the migration
    const { rows: verifyStatusRows } = await client.query(`
      SELECT id, name, is_closed, sequence, active
      FROM status
      WHERE name IN ('Resolved', 'On Hold')
      ORDER BY name
    `);

    console.log('✅ Verification - Status values after migration:');
    verifyStatusRows.forEach((row: any) => {
      console.log(`   - ${row.name} (ID: ${row.id}, Closed: ${row.is_closed}, Sequence: ${row.sequence}, Active: ${row.active})`);
    });
    console.log('');

    // Verify tickets were updated
    const { rows: verifyTicketRows } = await client.query(`
      SELECT COUNT(*) as count
      FROM ticket t
      JOIN status s ON s.id = t.status_id
      WHERE s.name = 'On Hold' AND s.active = true
    `);

    const onHoldTicketCount = parseInt(verifyTicketRows[0]?.count || '0', 10);
    console.log(`✅ Verification - Tickets now using "On Hold" status: ${onHoldTicketCount}`);
    console.log('');

    // Show all active statuses
    const { rows: allStatusRows } = await client.query(`
      SELECT name, is_closed, sequence
      FROM status
      WHERE active = true
      ORDER BY sequence, name
    `);

    console.log('📊 All active statuses:');
    allStatusRows.forEach((row: any) => {
      const closed = row.is_closed ? ' (closed)' : '';
      console.log(`   - ${row.name} (sequence: ${row.sequence})${closed}`);
    });

    console.log('\n🎉 Migration complete! "Resolved" has been replaced with "On Hold".');
    console.log('   - "On Hold" is an open status (not closed)');
    console.log('   - All tickets previously marked as "Resolved" are now "On Hold"');
    console.log('   - The "Resolved" status has been deactivated\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

