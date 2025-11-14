/**
 * Run the attachment database storage migration
 * Adds file_data column and makes storage_url nullable
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/db/pool';

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting attachment database storage migration...\n');

    // Read the migration SQL file
    const migrationPath = join(__dirname, '../sql/005_store_attachments_in_db.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('=' .repeat(60));
    console.log(migrationSQL);
    console.log('=' .repeat(60));
    console.log('');

    // Check if column already exists
    const { rows: checkRows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_attachment'
      AND column_name = 'file_data'
    `);

    if (checkRows.length > 0) {
      console.log('⚠️  Migration already applied! Column file_data already exists.');
      console.log(`   Type: ${checkRows[0].data_type}`);
      console.log(`   Nullable: ${checkRows[0].is_nullable}`);
      console.log('✅ Nothing to do.\n');
      return;
    }

    // Check storage_url nullable status
    const { rows: storageUrlRows } = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_attachment'
      AND column_name = 'storage_url'
    `);

    if (storageUrlRows.length > 0) {
      console.log(`📋 Current storage_url status: ${storageUrlRows[0].is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    }

    console.log('▶️  Applying migration...\n');

    // Run the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the column was added
    const { rows: verifyRows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_attachment'
      AND column_name = 'file_data'
    `);

    if (verifyRows.length > 0) {
      console.log('✅ Verification: file_data column exists');
      console.log(`   Type: ${verifyRows[0].data_type}`);
      console.log(`   Nullable: ${verifyRows[0].is_nullable}`);
      console.log('');
    }

    // Verify storage_url is now nullable
    const { rows: verifyStorageUrl } = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_attachment'
      AND column_name = 'storage_url'
    `);

    if (verifyStorageUrl.length > 0) {
      console.log('✅ Verification: storage_url is now nullable');
      console.log(`   Nullable: ${verifyStorageUrl[0].is_nullable}`);
      console.log('');
    }

    // Show current ticket_attachment table structure
    console.log('📊 Current ticket_attachment table structure:');
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_attachment'
      ORDER BY ordinal_position
    `);

    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${nullable}`);
    });

    console.log('\n🎉 Migration complete! Attachments can now be stored directly in the database.');
    console.log('   - Use POST /tickets/:id/attachments to upload files');
    console.log('   - Use GET /attachments/:id/download to download files\n');

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

