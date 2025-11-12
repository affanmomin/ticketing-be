/**
 * Run the stream hierarchy migration
 * Adds parent_stream_id column to stream table
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/db/pool';

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting stream hierarchy migration...\n');

    // Read the migration SQL file
    const migrationPath = join(__dirname, '../sql/004_add_stream_hierarchy.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('=' .repeat(60));
    console.log(migrationSQL);
    console.log('=' .repeat(60));
    console.log('');

    // Check if column already exists
    const { rows: checkRows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'stream'
      AND column_name = 'parent_stream_id'
    `);

    if (checkRows.length > 0) {
      console.log('⚠️  Migration already applied! Column parent_stream_id already exists.');
      console.log('✅ Nothing to do.\n');
      return;
    }

    console.log('▶️  Applying migration...\n');

    // Run the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the column was added
    const { rows: verifyRows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stream'
      AND column_name = 'parent_stream_id'
    `);

    if (verifyRows.length > 0) {
      console.log('✅ Verification: parent_stream_id column exists');
      console.log(`   Type: ${verifyRows[0].data_type}`);
      console.log(`   Nullable: ${verifyRows[0].is_nullable}`);
      console.log('');
    }

    // Show current stream table structure
    console.log('📊 Current stream table structure:');
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stream'
      ORDER BY ordinal_position
    `);

    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${nullable}`);
    });

    console.log('\n🎉 Migration complete! You can now:');
    console.log('   1. Create parent streams (parentStreamId = null)');
    console.log('   2. Create child streams (parentStreamId = parent UUID)');
    console.log('   3. Use GET /projects/:id/streams/parents');
    console.log('   4. Use GET /streams/:id/children\n');

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

