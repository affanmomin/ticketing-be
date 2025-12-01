import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { pool } from '../src/db/pool';
import { formatClientTicketNumber } from '../src/utils/ticket-number';

// Generate random email
function generateRandomEmail(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  const domains = ['example.com', 'demo.com', 'test.com', 'mail.com', 'email.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${prefix}-${random}@${domain}`;
}

// Generate random name
function generateRandomName(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix} ${random.charAt(0).toUpperCase() + random.slice(1)}`;
}

async function allocateClientTicketSequence(client: PoolClient, clientId: string): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO client_ticket_counter (client_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (client_id)
     DO UPDATE SET last_number = client_ticket_counter.last_number + 1
     RETURNING last_number`,
    [clientId]
  );

  return rows[0].last_number;
}

interface Credentials {
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
  email: string;
  password: string;
  fullName: string;
  clientName?: string;
}

const credentials: Credentials[] = [];
const DEMO_PASSWORD = 'soccer12';

async function main() {
  console.log('🚀 Starting E2E demo data creation...\n');
  console.log(`🔐 All accounts will use password: ${DEMO_PASSWORD}\n`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Organization and Admin
    console.log('1. Creating organization and admin user...');
    const orgName = `Demo Organization ${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const adminEmail = generateRandomEmail('admin');
    const adminFullName = 'Admin User';

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Create organization
    const { rows: orgRows } = await client.query(
      'INSERT INTO organization (name) VALUES ($1) RETURNING id',
      [orgName]
    );
    const organizationId = orgRows[0].id;

    // Create admin user
    const { rows: adminRows } = await client.query(
      `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, NULL, true)
       RETURNING id`,
      [organizationId, 'ADMIN', adminEmail, adminFullName, passwordHash]
    );
    const adminId = adminRows[0].id;

    credentials.push({
      role: 'ADMIN',
      email: adminEmail,
      password: DEMO_PASSWORD,
      fullName: adminFullName,
    });

    console.log(`   ✓ Organization: ${orgName}`);
    console.log(`   ✓ Admin created: ${adminEmail} / ${DEMO_PASSWORD}`);

    // 2. Create Clients
    console.log('\n2. Creating clients...');
    const clients = [
      { name: 'Acme Corporation', phone: '+1-555-0101' },
      { name: 'Tech Solutions Inc', phone: '+1-555-0102' },
      { name: 'Global Industries', phone: '+1-555-0103' },
      { name: 'Digital Ventures', phone: '+1-555-0104' },
    ];

    const clientIds: string[] = [];
    const clientInfoById: Record<string, { name: string }> = {};
    for (const clientData of clients) {
      const clientEmail = generateRandomEmail('client');
      const { rows } = await client.query(
        `INSERT INTO client (organization_id, name, email, phone, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [organizationId, clientData.name, clientEmail, clientData.phone]
      );
      clientIds.push(rows[0].id);
      clientInfoById[rows[0].id] = { name: clientData.name };
      console.log(`   ✓ Client created: ${clientData.name} (${clientEmail})`);
    }

    // 3. Create Employees
    console.log('\n3. Creating employees...');
    const employeeCount = 5;
    const employees: Array<{ email: string; fullName: string }> = [];
    const employeeIds: string[] = [];

    for (let i = 0; i < employeeCount; i++) {
      const empEmail = generateRandomEmail('employee');
      const empFullName = generateRandomName('Employee');
      employees.push({ email: empEmail, fullName: empFullName });

      const empPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const { rows } = await client.query(
        `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
         VALUES ($1, $2, $3, $4, $5, NULL, true)
         RETURNING id`,
        [organizationId, 'EMPLOYEE', empEmail, empFullName, empPasswordHash]
      );
      employeeIds.push(rows[0].id);
      credentials.push({
        role: 'EMPLOYEE',
        email: empEmail,
        password: DEMO_PASSWORD,
        fullName: empFullName,
      });
      console.log(`   ✓ Employee ${i + 1}: ${empEmail} / ${DEMO_PASSWORD}`);
    }

    // 4. Create Client Users
    console.log('\n4. Creating client users...');
    const clientUsers: Array<{ email: string; fullName: string; clientId: string; clientName: string }> = [];
    const clientUserIds: string[] = [];

    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const clientName = clients[i].name;
      const cuEmail = generateRandomEmail('clientuser');
      const cuFullName = generateRandomName('Client User');

      const cuPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const { rows } = await client.query(
        `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [organizationId, 'CLIENT', cuEmail, cuFullName, cuPasswordHash, clientId]
      );
      clientUserIds.push(rows[0].id);
      clientUsers.push({ email: cuEmail, fullName: cuFullName, clientId, clientName });
      credentials.push({
        role: 'CLIENT',
        email: cuEmail,
        password: DEMO_PASSWORD,
        fullName: cuFullName,
        clientName,
      });
      console.log(`   ✓ Client user ${i + 1}: ${cuEmail} / ${DEMO_PASSWORD} (${clientName})`);
    }

    // 5. Get Taxonomy (Priority and Status)
    console.log('\n5. Fetching taxonomy...');
    const { rows: priorities } = await client.query('SELECT id, name FROM priority WHERE active = true ORDER BY rank');
    const { rows: statuses } = await client.query('SELECT id, name, is_closed FROM status WHERE active = true ORDER BY sequence');

    const priorityMap: Record<string, string> = {};
    priorities.forEach((p: any) => {
      priorityMap[p.name.toLowerCase()] = p.id;
    });

    const statusMap: Record<string, string> = {};
    statuses.forEach((s: any) => {
      statusMap[s.name.toLowerCase().replace(' ', '')] = s.id;
    });

    console.log(`   ✓ Found ${priorities.length} priorities and ${statuses.length} statuses`);

    // 6. Create Projects
    console.log('\n6. Creating projects...');
    const projectIds: string[] = [];
    const projects = [
      { name: 'Website Redesign', clientId: clientIds[0], description: 'Complete redesign of the corporate website' },
      { name: 'Mobile App Development', clientId: clientIds[0], description: 'Native mobile app for iOS and Android' },
      { name: 'API Integration', clientId: clientIds[1], description: 'Third-party API integration project' },
      { name: 'Cloud Migration', clientId: clientIds[1], description: 'Migrating infrastructure to cloud' },
      { name: 'Security Audit', clientId: clientIds[2], description: 'Comprehensive security assessment' },
      { name: 'Performance Optimization', clientId: clientIds[2], description: 'System performance improvements' },
      { name: 'E-commerce Platform', clientId: clientIds[3], description: 'New e-commerce solution' },
      { name: 'Data Analytics Dashboard', clientId: clientIds[3], description: 'Business intelligence dashboard' },
    ];

    for (const proj of projects) {
      const { rows } = await client.query(
        `INSERT INTO project (client_id, name, description, active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [proj.clientId, proj.name, proj.description]
      );
      projectIds.push(rows[0].id);
      console.log(`   ✓ Project created: ${proj.name}`);
    }

    // 7. Create Streams (Parent and Child/Substreams) and Subjects for each project
    console.log('\n7. Creating streams (with hierarchy) and subjects...');
    const streamIds: string[] = [];
    const parentStreamIds: string[] = [];
    const childStreamIds: string[] = [];
    const subjectIds: string[] = [];
    const streamsByProject: Record<string, string[]> = {}; // Map projectId to array of streamIds
    const subjectsByProject: Record<string, string[]> = {}; // Map projectId to array of subjectIds

    // Parent stream names
    const parentStreamNames = ['Frontend', 'Backend', 'DevOps', 'Support', 'QA'];
    // Child stream names (substreams) for each parent
    const childStreamMap: Record<string, string[]> = {
      'Frontend': ['UI Components', 'User Interface', 'Responsive Design'],
      'Backend': ['API Development', 'Database', 'Authentication'],
      'DevOps': ['CI/CD', 'Infrastructure', 'Monitoring'],
      'Support': ['Technical Support', 'Customer Service', 'Documentation'],
      'QA': ['Testing', 'Bug Tracking', 'Quality Assurance'],
    };

    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const projectName = projects[i].name;
      streamsByProject[projectId] = [];
      subjectsByProject[projectId] = [];

      // Create parent streams (3-4 per project)
      const numParentStreams = 3 + (i % 2); // 3 or 4 parent streams
      const selectedParentStreams = parentStreamNames.slice(0, numParentStreams);

      for (const parentStreamName of selectedParentStreams) {
        const { rows } = await client.query(
          `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
           VALUES ($1, NULL, $2, $3, true)
           RETURNING id`,
          [projectId, parentStreamName, `Parent stream: ${parentStreamName} for ${projectName}`]
        );
        const parentStreamId = rows[0].id;
        parentStreamIds.push(parentStreamId);
        streamIds.push(parentStreamId);
        streamsByProject[projectId].push(parentStreamId);
        console.log(`   ✓ Parent stream created: ${parentStreamName} (project: ${projectName})`);

        // Create child streams (substreams) for this parent
        const childStreamNames = childStreamMap[parentStreamName] || ['Substream 1', 'Substream 2'];
        // Create 2-3 child streams per parent
        const numChildStreams = 2 + (i % 2); // 2 or 3 child streams
        const selectedChildStreams = childStreamNames.slice(0, numChildStreams);

        for (const childStreamName of selectedChildStreams) {
          const { rows: childRows } = await client.query(
            `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id`,
            [projectId, parentStreamId, childStreamName, `Child stream: ${childStreamName} under ${parentStreamName}`]
          );
          const childStreamId = childRows[0].id;
          childStreamIds.push(childStreamId);
          streamIds.push(childStreamId);
          streamsByProject[projectId].push(childStreamId);
          console.log(`     → Child stream created: ${childStreamName} (parent: ${parentStreamName})`);
        }
      }

      // Create subjects
      const subjects = ['Bug Report', 'Feature Request', 'Question', 'Enhancement', 'Documentation'];
      for (const subjectName of subjects) {
        const { rows } = await client.query(
          `INSERT INTO subject (project_id, name, description, active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [projectId, subjectName, `Subject for ${subjectName} in ${projectName}`]
        );
        const subjectId = rows[0].id;
        subjectIds.push(subjectId);
        subjectsByProject[projectId].push(subjectId);
      }
    }
    console.log(`   ✓ Created ${parentStreamIds.length} parent streams, ${childStreamIds.length} child streams, and ${subjectIds.length} subjects`);

    // 8. Add Project Members
    console.log('\n8. Adding project members...');
    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];

      // Add admin as manager
      await client.query(
        `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
         VALUES ($1, $2, 'MANAGER', true, true)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [projectId, adminId]
      );

      // Add 2-3 employees as members per project
      const numMembers = 2 + (i % 2); // 2 or 3 members
      for (let j = 0; j < numMembers && j < employeeIds.length; j++) {
        const empIndex = (i + j) % employeeIds.length;
        await client.query(
          `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
           VALUES ($1, $2, 'MEMBER', true, true)
           ON CONFLICT (project_id, user_id) DO NOTHING`,
          [projectId, employeeIds[empIndex]]
        );
      }
    }
    console.log(`   ✓ Added members to ${projectIds.length} projects`);

    // 9. Create Tickets (using both parent and child streams)
    console.log('\n9. Creating tickets...');
    const ticketIds: string[] = [];
    const ticketTitles = [
      'Login page not working',
      'Add dark mode feature',
      'Payment gateway integration',
      'Database connection timeout',
      'User profile update bug',
      'Email notification not sending',
      'Search functionality slow',
      'Mobile app crashes on iOS',
      'API rate limiting needed',
      'Dashboard performance issues',
      'File upload size limit',
      'Password reset not working',
      'Calendar sync issue',
      'Report generation error',
      'Multi-language support',
      'Real-time notifications',
      'Export to PDF feature',
      'User permissions bug',
      'Session timeout too short',
      'Image upload compression',
      'Bulk operations support',
      'Advanced filtering options',
      'Custom field validation',
      'Webhook integration',
      'Audit log improvements',
    ];

    let ticketIndex = 0;
    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const project = projects[i];

      // Get streams for this project (both parent and child)
      const projectStreams = streamsByProject[projectId] || [];
      // Get subjects for this project
      const projectSubjects = subjectsByProject[projectId] || [];

      // Create 3-4 tickets per project
      const ticketsPerProject = 3 + (i % 2);
      for (let j = 0; j < ticketsPerProject && ticketIndex < ticketTitles.length; j++) {
        const title = ticketTitles[ticketIndex];
        // Use both parent and child streams
        if (projectStreams.length === 0 || projectSubjects.length === 0) {
          console.warn(`   ⚠ Skipping ticket for project ${project.name} - no streams or subjects`);
          continue;
        }
        const streamId = projectStreams[ticketIndex % projectStreams.length] || projectStreams[0];
        const subjectId = projectSubjects[ticketIndex % projectSubjects.length] || projectSubjects[0];
        const priorityId = priorities[ticketIndex % priorities.length].id;
        const statusId = statuses[ticketIndex % statuses.length].id;

        // Assign to employee or leave unassigned
        const assignedTo = ticketIndex % 3 === 0 ? null : employeeIds[ticketIndex % employeeIds.length];
        const raisedBy = ticketIndex % 2 === 0 ? adminId : employeeIds[ticketIndex % employeeIds.length];

        const clientMeta = clientInfoById[project.clientId] ?? { name: 'UNKNOWN' };
        const ticketSequence = await allocateClientTicketSequence(client, project.clientId);
        const clientTicketNumber = formatClientTicketNumber(clientMeta.name, ticketSequence);

        const { rows } = await client.query(
          `INSERT INTO ticket (project_id, raised_by_user_id, assigned_to_user_id, stream_id, subject_id, priority_id, status_id, title, description_md, client_ticket_number, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
           RETURNING id`,
          [
            projectId,
            raisedBy,
            assignedTo,
            streamId,
            subjectId,
            priorityId,
            statusId,
            title,
            `Detailed description for ${title}. This ticket covers the issue in depth with relevant context and requirements.`,
            clientTicketNumber,
          ]
        );
        const ticketId = rows[0].id;
        ticketIds.push(ticketId);

        // Create ticket event
        await client.query(
          `INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
           VALUES ($1, $2, 'TICKET_CREATED', $3::jsonb)`,
          [ticketId, raisedBy, JSON.stringify({ title, description: `Description for ${title}` })]
        );

        ticketIndex++;
      }
    }
    console.log(`   ✓ Created ${ticketIds.length} tickets`);

    // 10. Create Comments
    console.log('\n10. Creating comments...');
    let commentCount = 0;
    for (let i = 0; i < ticketIds.length; i++) {
      const ticketId = ticketIds[i];

      // Add 1-4 comments per ticket
      const commentsPerTicket = 1 + (i % 4);
      for (let j = 0; j < commentsPerTicket; j++) {
        // Mix of admin, employees, and sometimes client users
        let authorId: string;
        if (j === 0) {
          authorId = adminId;
        } else if (j % 2 === 0 && clientUserIds.length > 0) {
          authorId = clientUserIds[i % clientUserIds.length];
        } else {
          authorId = employeeIds[j % employeeIds.length];
        }

        const visibility = j === 0 && i % 2 === 0 ? 'INTERNAL' : 'PUBLIC';

        await client.query(
          `INSERT INTO ticket_comment (ticket_id, author_id, visibility, body_md)
           VALUES ($1, $2, $3, $4)`,
          [
            ticketId,
            authorId,
            visibility,
            `Comment ${j + 1} on ticket. This is a ${visibility.toLowerCase()} comment with additional context and updates.`,
          ]
        );

        // Create comment event
        await client.query(
          `INSERT INTO ticket_event (ticket_id, actor_id, event_type, new_value)
           VALUES ($1, $2, 'COMMENT_ADDED', $3::jsonb)`,
          [ticketId, authorId, JSON.stringify({ visibility, body: `Comment ${j + 1} on ticket` })]
        );

        commentCount++;
      }
    }
    console.log(`   ✓ Created ${commentCount} comments`);

    // 11. Create some status/priority changes
    console.log('\n11. Creating ticket updates...');
    let updateCount = 0;
    for (let i = 0; i < Math.min(ticketIds.length, 15); i++) {
      const ticketId = ticketIds[i];
      const actorId = employeeIds[i % employeeIds.length];

      // Status change
      if (i % 2 === 0 && statuses.length > 1) {
        const newStatusId = statuses[(i + 1) % statuses.length].id;
        await client.query(
          `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
           VALUES ($1, $2, 'STATUS_CHANGED', $3::jsonb, $4::jsonb)`,
          [
            ticketId,
            actorId,
            JSON.stringify({ statusId: statuses[i % statuses.length].id }),
            JSON.stringify({ statusId: newStatusId }),
          ]
        );
        updateCount++;
      }

      // Priority change
      if (i % 3 === 0 && priorities.length > 1) {
        const newPriorityId = priorities[(i + 1) % priorities.length].id;
        await client.query(
          `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
           VALUES ($1, $2, 'PRIORITY_CHANGED', $3::jsonb, $4::jsonb)`,
          [
            ticketId,
            actorId,
            JSON.stringify({ priorityId: priorities[i % priorities.length].id }),
            JSON.stringify({ priorityId: newPriorityId }),
          ]
        );
        updateCount++;
      }

      // Assignment change
      if (i % 4 === 0 && employeeIds.length > 0) {
        const newAssigneeId = employeeIds[(i + 1) % employeeIds.length];
        await client.query(
          `INSERT INTO ticket_event (ticket_id, actor_id, event_type, old_value, new_value)
           VALUES ($1, $2, 'ASSIGNEE_CHANGED', $3::jsonb, $4::jsonb)`,
          [
            ticketId,
            actorId,
            JSON.stringify({ assignedToUserId: employeeIds[i % employeeIds.length] }),
            JSON.stringify({ assignedToUserId: newAssigneeId }),
          ]
        );
        updateCount++;
      }
    }
    console.log(`   ✓ Created ${updateCount} ticket updates`);

    await client.query('COMMIT');

    console.log('\n✅ E2E demo data creation completed!\n');
    console.log('='.repeat(70));
    console.log('📋 LOGIN CREDENTIALS');
    console.log('='.repeat(70));
    console.log(`\n🔐 PASSWORD FOR ALL ACCOUNTS: ${DEMO_PASSWORD}\n`);

    console.log('🔐 ADMIN:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`   Full Name: ${adminFullName}`);

    console.log('\n👤 EMPLOYEES:');
    employees.forEach((emp, i) => {
      console.log(`   ${i + 1}. Email: ${emp.email}`);
      console.log(`      Password: ${DEMO_PASSWORD}`);
      console.log(`      Full Name: ${emp.fullName}`);
    });

    console.log('\n🏢 CLIENT USERS:');
    clientUsers.forEach((cu, i) => {
      console.log(`   ${i + 1}. Email: ${cu.email}`);
      console.log(`      Password: ${DEMO_PASSWORD}`);
      console.log(`      Full Name: ${cu.fullName}`);
      console.log(`      Client: ${cu.clientName}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('📊 DATA SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Organization: ${orgName}`);
    console.log(`   Clients: ${clients.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Employees: ${employees.length}`);
    console.log(`   Client Users: ${clientUsers.length}`);
    console.log(`   Parent Streams: ${parentStreamIds.length}`);
    console.log(`   Child Streams (Substreams): ${childStreamIds.length}`);
    console.log(`   Total Streams: ${streamIds.length}`);
    console.log(`   Subjects: ${subjectIds.length}`);
    console.log(`   Tickets: ${ticketIds.length}`);
    console.log(`   Comments: ${commentCount}`);
    console.log(`   Ticket Updates: ${updateCount}`);
    console.log('='.repeat(70));
    console.log('\n🚀 You can now test the system with any of the above credentials!\n');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating demo data:', e);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

