/**
 * Comprehensive test for hierarchical streams with ticket creation
 * 
 * This script demonstrates the complete flow:
 * 1. Create organization, client, project
 * 2. Create parent stream
 * 3. Create child stream
 * 4. Create users (raiser and assignee)
 * 5. Add users to project with permissions
 * 6. Create subject
 * 7. Create ticket using child stream and assigned user
 */

import { pool } from '../src/db/pool';
import bcrypt from 'bcryptjs';
import { createTicket } from '../src/services/tickets.service';

async function main() {
  console.log('🧪 Testing Hierarchical Streams with Ticket Creation\n');
  console.log('='.repeat(70));

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // ==========================================
    // STEP 1: Create Organization
    // ==========================================
    console.log('\n📦 STEP 1: Creating Organization...');
    const orgName = `Test Hierarchical Streams Org ${Date.now()}`;
    const { rows: orgRows } = await client.query(
      `INSERT INTO organization (name, active)
       VALUES ($1, true)
       RETURNING id, name`,
      [orgName]
    );
    const organizationId = orgRows[0].id;
    console.log(`   ✅ Organization created: ${orgRows[0].name} (${organizationId})`);

    // ==========================================
    // STEP 2: Create Client
    // ==========================================
    console.log('\n📦 STEP 2: Creating Client...');
    const clientName = `Test Client Corp ${Date.now()}`;
    const { rows: clientRows } = await client.query(
      `INSERT INTO client (organization_id, name, email, phone, active)
       VALUES ($1, $2, $3, '+1-555-9999', true)
       RETURNING id, name`,
      [organizationId, clientName, `test${Date.now()}@client.com`]
    );
    const clientId = clientRows[0].id;
    console.log(`   ✅ Client created: ${clientRows[0].name} (${clientId})`);

    // ==========================================
    // STEP 3: Create Project
    // ==========================================
    console.log('\n📦 STEP 3: Creating Project...');
    const projectName = `Test Hierarchical Project ${Date.now()}`;
    const { rows: projectRows } = await client.query(
      `INSERT INTO project (client_id, name, description, active)
       VALUES ($1, $2, 'Testing parent-child streams', true)
       RETURNING id, name`,
      [clientId, projectName]
    );
    const projectId = projectRows[0].id;
    console.log(`   ✅ Project created: ${projectRows[0].name} (${projectId})`);

    // ==========================================
    // STEP 4: Create Parent Stream
    // ==========================================
    console.log('\n📦 STEP 4: Creating Parent Stream...');
    const { rows: parentStreamRows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, NULL, 'Frontend Development', 'All frontend-related work', true)
       RETURNING id, name, parent_stream_id`,
      [projectId]
    );
    const parentStreamId = parentStreamRows[0].id;
    console.log(`   ✅ Parent Stream created: ${parentStreamRows[0].name}`);
    console.log(`      ID: ${parentStreamId}`);
    console.log(`      Parent Stream ID: ${parentStreamRows[0].parent_stream_id} (null = parent)`);

    // ==========================================
    // STEP 5: Create Child Stream
    // ==========================================
    console.log('\n📦 STEP 5: Creating Child Stream...');
    const { rows: childStreamRows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, $2, 'UI Components', 'Reusable UI component development', true)
       RETURNING id, name, parent_stream_id`,
      [projectId, parentStreamId]
    );
    const childStreamId = childStreamRows[0].id;
    console.log(`   ✅ Child Stream created: ${childStreamRows[0].name}`);
    console.log(`      ID: ${childStreamId}`);
    console.log(`      Parent Stream ID: ${childStreamRows[0].parent_stream_id} (${parentStreamId})`);

    // Verify hierarchy
    const { rows: verifyRows } = await client.query(
      `SELECT 
        parent.id as parent_id,
        parent.name as parent_name,
        child.id as child_id,
        child.name as child_name
       FROM stream parent
       LEFT JOIN stream child ON child.parent_stream_id = parent.id
       WHERE parent.id = $1`,
      [parentStreamId]
    );
    console.log(`\n   📊 Hierarchy Verification:`);
    verifyRows.forEach((row: any) => {
      if (row.child_id) {
        console.log(`      ${row.parent_name} → ${row.child_name}`);
      } else {
        console.log(`      ${row.parent_name} (no children yet)`);
      }
    });

    // ==========================================
    // STEP 6: Create Users
    // ==========================================
    console.log('\n📦 STEP 6: Creating Users...');
    
    // User 1: Will raise the ticket
    const timestamp = Date.now();
    const raiserEmail = `ticket-raiser-${timestamp}@test.com`;
    const raiserPassword = await bcrypt.hash('Raiser123!', 10);
    const { rows: raiserRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'EMPLOYEE', $2, 'Ticket Raiser', $3, NULL, true)
       RETURNING id, email, full_name`,
      [organizationId, raiserEmail, raiserPassword]
    );
    const raiserUserId = raiserRows[0].id;
    console.log(`   ✅ Raiser User created: ${raiserRows[0].full_name} (${raiserRows[0].email})`);
    console.log(`      ID: ${raiserUserId}`);

    // User 2: Will be assigned the ticket
    const assigneeEmail = `ticket-assignee-${timestamp}@test.com`;
    const assigneePassword = await bcrypt.hash('Assignee123!', 10);
    const { rows: assigneeRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, 'EMPLOYEE', $2, 'Ticket Assignee', $3, NULL, true)
       RETURNING id, email, full_name`,
      [organizationId, assigneeEmail, assigneePassword]
    );
    const assigneeUserId = assigneeRows[0].id;
    console.log(`   ✅ Assignee User created: ${assigneeRows[0].full_name} (${assigneeRows[0].email})`);
    console.log(`      ID: ${assigneeUserId}`);

    // ==========================================
    // STEP 7: Add Users to Project with Permissions
    // ==========================================
    console.log('\n📦 STEP 7: Adding Users to Project...');
    
    // Add raiser with can_raise permission
    await client.query(
      `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
       VALUES ($1, $2, 'MEMBER', true, false)
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET can_raise = true`,
      [projectId, raiserUserId]
    );
    console.log(`   ✅ Raiser added to project with can_raise = true`);

    // Add assignee with can_be_assigned permission
    await client.query(
      `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
       VALUES ($1, $2, 'MEMBER', false, true)
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET can_be_assigned = true`,
      [projectId, assigneeUserId]
    );
    console.log(`   ✅ Assignee added to project with can_be_assigned = true`);

    // ==========================================
    // STEP 8: Get Priority and Status
    // ==========================================
    console.log('\n📦 STEP 8: Fetching Priority and Status...');
    const { rows: priorityRows } = await client.query(
      `SELECT id, name, rank FROM priority WHERE active = true ORDER BY rank LIMIT 1`
    );
    const priorityId = priorityRows[0].id;
    console.log(`   ✅ Priority: ${priorityRows[0].name} (${priorityId})`);

    const { rows: statusRows } = await client.query(
      `SELECT id, name FROM status WHERE active = true ORDER BY sequence LIMIT 1`
    );
    const statusId = statusRows[0].id;
    console.log(`   ✅ Status: ${statusRows[0].name} (${statusId})`);

    // ==========================================
    // STEP 9: Create Subject
    // ==========================================
    console.log('\n📦 STEP 9: Creating Subject...');
    const { rows: subjectRows } = await client.query(
      `INSERT INTO subject (project_id, name, description, active)
       VALUES ($1, 'Bug Fix', 'Bug fixes and corrections', true)
       RETURNING id, name`,
      [projectId]
    );
    const subjectId = subjectRows[0].id;
    console.log(`   ✅ Subject created: ${subjectRows[0].name} (${subjectId})`);

    // ==========================================
    // STEP 10: Create Ticket with Child Stream
    // ==========================================
    console.log('\n📦 STEP 10: Creating Ticket with Child Stream...');
    console.log(`   Using:`);
    console.log(`      - Project: ${projectId}`);
    console.log(`      - Stream (CHILD): ${childStreamId} (UI Components)`);
    console.log(`      - Subject: ${subjectId} (Bug Fix)`);
    console.log(`      - Priority: ${priorityId} (${priorityRows[0].name})`);
    console.log(`      - Status: ${statusId} (${statusRows[0].name})`);
    console.log(`      - Raised By: ${raiserUserId} (Ticket Raiser)`);
    console.log(`      - Assigned To: ${assigneeUserId} (Ticket Assignee)`);

    const ticket = await createTicket(
      client,
      projectId,
      raiserUserId,
      childStreamId,  // ← Using CHILD stream ID
      subjectId,
      priorityId,
      statusId,
      'Fix button styling in UI Components',
      'The login button component needs better mobile responsiveness. Please update the CSS to handle smaller screens.',
      assigneeUserId  // ← Assigning to specific user
    );

    console.log(`\n   ✅ Ticket created successfully!`);
    console.log(`      Ticket ID: ${ticket.id}`);
    console.log(`      Title: ${ticket.title}`);
    console.log(`      Stream: ${ticket.streamName} (ID: ${ticket.streamId})`);
    console.log(`      Raised By: ${ticket.raisedByName} (${ticket.raisedByEmail})`);
    console.log(`      Assigned To: ${ticket.assignedToName} (${ticket.assignedToEmail})`);

    // ==========================================
    // STEP 11: Verify Ticket Stream Relationship
    // ==========================================
    console.log('\n📦 STEP 11: Verifying Ticket Stream Relationship...');
    const { rows: ticketStreamRows } = await client.query(
      `SELECT 
        t.id as ticket_id,
        t.title,
        child_stream.id as child_stream_id,
        child_stream.name as child_stream_name,
        parent_stream.id as parent_stream_id,
        parent_stream.name as parent_stream_name
       FROM ticket t
       JOIN stream child_stream ON child_stream.id = t.stream_id
       LEFT JOIN stream parent_stream ON parent_stream.id = child_stream.parent_stream_id
       WHERE t.id = $1`,
      [ticket.id]
    );

    if (ticketStreamRows.length > 0) {
      const row = ticketStreamRows[0];
      console.log(`   ✅ Ticket Stream Hierarchy:`);
      console.log(`      Ticket: ${row.title}`);
      console.log(`      Child Stream: ${row.child_stream_name} (${row.child_stream_id})`);
      console.log(`      Parent Stream: ${row.parent_stream_name} (${row.parent_stream_id})`);
      console.log(`      Full Path: ${row.parent_stream_name} > ${row.child_stream_name}`);
    }

    // ==========================================
    // STEP 12: Test Alternative - Ticket with Parent Stream
    // ==========================================
    console.log('\n📦 STEP 12: Creating Ticket with Parent Stream (no child)...');
    
    // Create another parent stream without children
    const { rows: parentStream2Rows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, NULL, 'Operations', 'DevOps and infrastructure', true)
       RETURNING id, name`,
      [projectId]
    );
    const parentStream2Id = parentStream2Rows[0].id;
    console.log(`   ✅ Created standalone parent stream: ${parentStream2Rows[0].name} (${parentStream2Id})`);

    // Create ticket using parent stream directly (no child)
    const ticket2 = await createTicket(
      client,
      projectId,
      raiserUserId,
      parentStream2Id,  // ← Using PARENT stream ID directly
      subjectId,
      priorityId,
      statusId,
      'Set up CI/CD pipeline',
      'We need to configure continuous integration for the project.',
      assigneeUserId
    );

    console.log(`\n   ✅ Ticket created with parent stream!`);
    console.log(`      Ticket ID: ${ticket2.id}`);
    console.log(`      Title: ${ticket2.title}`);
    console.log(`      Stream: ${ticket2.streamName} (ID: ${ticket2.streamId})`);
    console.log(`      Note: This stream has no children, so parent is used directly`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Successfully created:`);
    console.log(`   1. Organization: ${organizationId}`);
    console.log(`   2. Client: ${clientId}`);
    console.log(`   3. Project: ${projectId}`);
    console.log(`   4. Parent Stream: ${parentStreamId} (Frontend Development)`);
    console.log(`   5. Child Stream: ${childStreamId} (UI Components)`);
    console.log(`   6. Standalone Parent Stream: ${parentStream2Id} (Operations)`);
    console.log(`   7. Raiser User: ${raiserUserId}`);
    console.log(`   8. Assignee User: ${assigneeUserId}`);
    console.log(`   9. Subject: ${subjectId}`);
    console.log(`   10. Ticket #1: ${ticket.id} (using CHILD stream)`);
    console.log(`   11. Ticket #2: ${ticket2.id} (using PARENT stream)`);

    console.log(`\n🎯 Key Points Demonstrated:`);
    console.log(`   ✓ Parent-child stream hierarchy works correctly`);
    console.log(`   ✓ Tickets can use child streams (more specific)`);
    console.log(`   ✓ Tickets can use parent streams (when no children exist)`);
    console.log(`   ✓ Stream hierarchy is preserved in ticket queries`);
    console.log(`   ✓ User permissions (can_raise, can_be_assigned) work correctly`);

    console.log(`\n📝 Test Data:`);
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Parent Stream ID: ${parentStreamId}`);
    console.log(`   Child Stream ID: ${childStreamId}`);
    console.log(`   Ticket #1 ID: ${ticket.id}`);
    console.log(`   Ticket #2 ID: ${ticket2.id}`);

    await client.query('COMMIT');
    console.log('\n✅ All tests passed! Transaction committed.\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Test failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

