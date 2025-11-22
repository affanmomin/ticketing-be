import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { pool } from '../src/db/pool';
import { formatClientTicketNumber } from '../src/utils/ticket-number';

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
}

const credentials: Credentials[] = [];

async function main() {
  console.log('🚀 Starting demo data population...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Organization and Admin
    console.log('1. Creating organization and admin user...');
    const orgName = 'Demo Ticketing Organization';
    const adminEmail = 'admin@demo.com';
    const adminPassword = 'Admin123!';
    const adminFullName = 'Admin User';

    const passwordHash = await bcrypt.hash(adminPassword, 10);

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
      password: adminPassword,
      fullName: adminFullName,
    });

    console.log(`   ✓ Admin created: ${adminEmail} / ${adminPassword}`);

    // 2. Create Clients
    console.log('\n2. Creating clients...');
    const clients = [
      { name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1-555-0101' },
      { name: 'Tech Solutions Inc', email: 'info@techsolutions.com', phone: '+1-555-0102' },
      { name: 'Global Industries', email: 'support@global.com', phone: '+1-555-0103' },
    ];

    const clientIds: string[] = [];
    const clientInfoById: Record<string, { name: string }> = {};
    for (const clientData of clients) {
      const { rows } = await client.query(
        `INSERT INTO client (organization_id, name, email, phone, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [organizationId, clientData.name, clientData.email, clientData.phone]
      );
      clientIds.push(rows[0].id);
      clientInfoById[rows[0].id] = { name: clientData.name };
      console.log(`   ✓ Client created: ${clientData.name}`);
    }

    // 3. Create Employees
    console.log('\n3. Creating employees...');
    const employees = [
      { email: 'employee1@demo.com', password: 'Employee123!', fullName: 'John Doe' },
      { email: 'employee2@demo.com', password: 'Employee123!', fullName: 'Jane Smith' },
      { email: 'employee3@demo.com', password: 'Employee123!', fullName: 'Bob Johnson' },
    ];

    const employeeIds: string[] = [];
    for (const emp of employees) {
      const empPasswordHash = await bcrypt.hash(emp.password, 10);
      const { rows } = await client.query(
        `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
         VALUES ($1, $2, $3, $4, $5, NULL, true)
         RETURNING id`,
        [organizationId, 'EMPLOYEE', emp.email, emp.fullName, empPasswordHash]
      );
      employeeIds.push(rows[0].id);
      credentials.push({
        role: 'EMPLOYEE',
        email: emp.email,
        password: emp.password,
        fullName: emp.fullName,
      });
      console.log(`   ✓ Employee created: ${emp.email} / ${emp.password}`);
    }

    // 4. Create Client Users
    console.log('\n4. Creating client users...');
    const clientUsers = [
      { email: 'client1@demo.com', password: 'Client123!', fullName: 'Alice Client', clientId: clientIds[0] },
      { email: 'client2@demo.com', password: 'Client123!', fullName: 'Charlie Client', clientId: clientIds[1] },
      { email: 'client3@demo.com', password: 'Client123!', fullName: 'Diana Client', clientId: clientIds[2] },
    ];

    const clientUserIds: string[] = [];
    for (const cu of clientUsers) {
      const cuPasswordHash = await bcrypt.hash(cu.password, 10);
      const { rows } = await client.query(
        `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [organizationId, 'CLIENT', cu.email, cu.fullName, cuPasswordHash, cu.clientId]
      );
      clientUserIds.push(rows[0].id);
      credentials.push({
        role: 'CLIENT',
        email: cu.email,
        password: cu.password,
        fullName: cu.fullName,
      });
      console.log(`   ✓ Client user created: ${cu.email} / ${cu.password}`);
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
      { name: 'Website Redesign', clientId: clientIds[0] },
      { name: 'Mobile App Development', clientId: clientIds[0] },
      { name: 'API Integration', clientId: clientIds[1] },
      { name: 'Cloud Migration', clientId: clientIds[1] },
      { name: 'Security Audit', clientId: clientIds[2] },
      { name: 'Performance Optimization', clientId: clientIds[2] },
    ];

    for (const proj of projects) {
      const { rows } = await client.query(
        `INSERT INTO project (client_id, name, description, active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [proj.clientId, proj.name, `Project: ${proj.name}`]
      );
      projectIds.push(rows[0].id);
      console.log(`   ✓ Project created: ${proj.name}`);
    }

    // 7. Create Streams and Subjects for each project
    console.log('\n7. Creating streams and subjects...');
    const streamIds: string[] = [];
    const subjectIds: string[] = [];

    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const projectName = projects[i].name;

      // Create streams
      const streams = ['Support', 'Development', 'Billing'];
      for (const streamName of streams) {
        const { rows } = await client.query(
          `INSERT INTO stream (project_id, name, description, active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [projectId, `${streamName}`, `Stream for ${streamName} issues in ${projectName}`]
        );
        streamIds.push(rows[0].id);
      }

      // Create subjects
      const subjects = ['Bug Report', 'Feature Request', 'Question'];
      for (const subjectName of subjects) {
        const { rows } = await client.query(
          `INSERT INTO subject (project_id, name, description, active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [projectId, `${subjectName}`, `Subject for ${subjectName} in ${projectName}`]
        );
        subjectIds.push(rows[0].id);
      }
    }
    console.log(`   ✓ Created ${streamIds.length} streams and ${subjectIds.length} subjects`);

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

      // Add employees as members (distribute across projects)
      const empIndex = i % employeeIds.length;
      await client.query(
        `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
         VALUES ($1, $2, 'MEMBER', true, true)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [projectId, employeeIds[empIndex]]
      );

      // Add another employee to some projects
      if (i % 2 === 0 && employeeIds.length > 1) {
        await client.query(
          `INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
           VALUES ($1, $2, 'MEMBER', true, true)
           ON CONFLICT (project_id, user_id) DO NOTHING`,
          [projectId, employeeIds[(empIndex + 1) % employeeIds.length]]
        );
      }
    }
    console.log(`   ✓ Added members to ${projectIds.length} projects`);

    // 9. Create Tickets
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
    ];

    let ticketIndex = 0;
    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const project = projects[i];

      // Get streams and subjects for this project
      const projectStreams = streamIds.slice(i * 3, (i + 1) * 3);
      const projectSubjects = subjectIds.slice(i * 3, (i + 1) * 3);

      // Create 2-3 tickets per project
      const ticketsPerProject = i < 2 ? 3 : 2;
      for (let j = 0; j < ticketsPerProject && ticketIndex < ticketTitles.length; j++) {
        const title = ticketTitles[ticketIndex];
        const streamId = projectStreams[j % projectStreams.length];
        const subjectId = projectSubjects[j % projectSubjects.length];
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
            `Description for ${title}. This is a detailed description of the issue.`,
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

      // Add 1-3 comments per ticket
      const commentsPerTicket = (i % 3) + 1;
      for (let j = 0; j < commentsPerTicket; j++) {
        const authorId = j === 0 ? adminId : employeeIds[j % employeeIds.length];
        const visibility = j === 0 && i % 2 === 0 ? 'INTERNAL' : 'PUBLIC';

        await client.query(
          `INSERT INTO ticket_comment (ticket_id, author_id, visibility, body_md)
           VALUES ($1, $2, $3, $4)`,
          [
            ticketId,
            authorId,
            visibility,
            `Comment ${j + 1} on ticket. This is a ${visibility.toLowerCase()} comment.`,
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
    for (let i = 0; i < Math.min(ticketIds.length, 10); i++) {
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
    }
    console.log(`   ✓ Created ${updateCount} ticket updates`);

    await client.query('COMMIT');

    console.log('\n✅ Demo data population completed!\n');
    console.log('='.repeat(60));
    console.log('📋 LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log('\n🔐 ADMIN:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Full Name: ${adminFullName}`);

    console.log('\n👤 EMPLOYEES:');
    employees.forEach((emp, i) => {
      console.log(`   ${i + 1}. Email: ${emp.email}`);
      console.log(`      Password: ${emp.password}`);
      console.log(`      Full Name: ${emp.fullName}`);
    });

    console.log('\n🏢 CLIENT USERS:');
    clientUsers.forEach((cu, i) => {
      console.log(`   ${i + 1}. Email: ${cu.email}`);
      console.log(`      Password: ${cu.password}`);
      console.log(`      Full Name: ${cu.fullName}`);
      console.log(`      Client: ${clients[i].name}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 DATA SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Organization: ${orgName}`);
    console.log(`   Clients: ${clients.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Employees: ${employees.length}`);
    console.log(`   Client Users: ${clientUsers.length}`);
    console.log(`   Tickets: ${ticketIds.length}`);
    console.log(`   Comments: ${commentCount}`);
    console.log(`   Streams: ${streamIds.length}`);
    console.log(`   Subjects: ${subjectIds.length}`);
    console.log('='.repeat(60));
    console.log('\n🚀 You can now test the dashboard with any of the above credentials!\n');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error populating demo data:', e);
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

