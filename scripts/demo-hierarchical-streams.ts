/**
 * Demo script for hierarchical streams feature
 * 
 * This script demonstrates:
 * 1. Creating parent streams
 * 2. Creating child streams
 * 3. Fetching parent streams for dropdown 1
 * 4. Fetching child streams for dropdown 2
 */

import { pool } from '../src/db/pool';

async function main() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🚀 Hierarchical Streams Demo\n');

    // Get or create a test organization and project
    const { rows: orgRows } = await client.query(
      `INSERT INTO organization (name) 
       VALUES ('Demo Org') 
       ON CONFLICT (name) DO UPDATE SET name = 'Demo Org'
       RETURNING id`
    );
    const orgId = orgRows[0].id;

    const { rows: clientRows } = await client.query(
      `INSERT INTO client (organization_id, name, email) 
       VALUES ($1, 'Demo Client', 'demo@example.com')
       ON CONFLICT (organization_id, name) DO UPDATE SET name = 'Demo Client'
       RETURNING id`,
      [orgId]
    );
    const clientId = clientRows[0].id;

    const { rows: projectRows } = await client.query(
      `INSERT INTO project (client_id, name, description) 
       VALUES ($1, 'Demo Project', 'Testing hierarchical streams')
       ON CONFLICT (client_id, name) DO UPDATE SET name = 'Demo Project'
       RETURNING id`,
      [clientId]
    );
    const projectId = projectRows[0].id;

    console.log(`✅ Test project created: ${projectId}\n`);

    // Clean up existing demo streams
    await client.query(
      `DELETE FROM stream WHERE project_id = $1 AND name LIKE 'Demo%'`,
      [projectId]
    );

    // Step 1: Create parent streams
    console.log('📦 Creating parent streams...');
    
    const { rows: frontendRows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, NULL, 'Demo Frontend', 'Frontend development work', true)
       RETURNING id, name`,
      [projectId]
    );
    const frontendId = frontendRows[0].id;
    console.log(`   ✓ Created: ${frontendRows[0].name} (${frontendId})`);

    const { rows: backendRows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, NULL, 'Demo Backend', 'Backend development work', true)
       RETURNING id, name`,
      [projectId]
    );
    const backendId = backendRows[0].id;
    console.log(`   ✓ Created: ${backendRows[0].name} (${backendId})`);

    const { rows: opsRows } = await client.query(
      `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
       VALUES ($1, NULL, 'Demo Operations', 'DevOps and infrastructure', true)
       RETURNING id, name`,
      [projectId]
    );
    const opsId = opsRows[0].id;
    console.log(`   ✓ Created: ${opsRows[0].name} (${opsId})\n`);

    // Step 2: Create child streams for Frontend
    console.log('📦 Creating child streams for Frontend...');
    
    const frontendChildren = [
      { name: 'Demo UI Components', desc: 'Reusable UI components' },
      { name: 'Demo Pages', desc: 'Application pages' },
      { name: 'Demo Routing', desc: 'Navigation and routing' },
      { name: 'Demo Styling', desc: 'CSS and theming' },
    ];

    for (const child of frontendChildren) {
      const { rows } = await client.query(
        `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name`,
        [projectId, frontendId, child.name, child.desc]
      );
      console.log(`   ✓ Created: ${rows[0].name} (parent: Frontend)`);
    }

    // Step 3: Create child streams for Backend
    console.log('\n📦 Creating child streams for Backend...');
    
    const backendChildren = [
      { name: 'Demo API Endpoints', desc: 'REST API development' },
      { name: 'Demo Database', desc: 'Database schema and queries' },
      { name: 'Demo Authentication', desc: 'Auth and security' },
      { name: 'Demo Business Logic', desc: 'Core application logic' },
    ];

    for (const child of backendChildren) {
      const { rows } = await client.query(
        `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name`,
        [projectId, backendId, child.name, child.desc]
      );
      console.log(`   ✓ Created: ${rows[0].name} (parent: Backend)`);
    }

    // Step 4: Create child streams for Operations
    console.log('\n📦 Creating child streams for Operations...');
    
    const opsChildren = [
      { name: 'Demo CI/CD', desc: 'Continuous integration and deployment' },
      { name: 'Demo Monitoring', desc: 'Application monitoring' },
      { name: 'Demo Infrastructure', desc: 'Server and cloud setup' },
    ];

    for (const child of opsChildren) {
      const { rows } = await client.query(
        `INSERT INTO stream (project_id, parent_stream_id, name, description, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name`,
        [projectId, backendId, child.name, child.desc]
      );
      console.log(`   ✓ Created: ${rows[0].name} (parent: Operations)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 QUERY RESULTS (What your frontend will see)\n');

    // Simulate Dropdown 1: Get all parent streams
    console.log('🔽 Dropdown 1 - Parent Streams:');
    const { rows: parentStreams } = await client.query(
      `SELECT id, name, description 
       FROM stream 
       WHERE project_id = $1 AND parent_stream_id IS NULL AND active = true
       ORDER BY name ASC`,
      [projectId]
    );
    
    parentStreams.forEach((stream, idx) => {
      console.log(`   ${idx + 1}. ${stream.name}`);
    });

    // Simulate Dropdown 2: Get children for Frontend
    console.log('\n🔽 Dropdown 2 - Children of "Demo Frontend":');
    const { rows: frontendChildStreams } = await client.query(
      `SELECT id, name, description 
       FROM stream 
       WHERE parent_stream_id = $1 AND active = true
       ORDER BY name ASC`,
      [frontendId]
    );
    
    frontendChildStreams.forEach((stream, idx) => {
      console.log(`   ${idx + 1}. ${stream.name}`);
    });

    // Simulate Dropdown 2: Get children for Backend
    console.log('\n🔽 Dropdown 2 - Children of "Demo Backend":');
    const { rows: backendChildStreams } = await client.query(
      `SELECT id, name, description 
       FROM stream 
       WHERE parent_stream_id = $1 AND active = true
       ORDER BY name ASC`,
      [backendId]
    );
    
    backendChildStreams.forEach((stream, idx) => {
      console.log(`   ${idx + 1}. ${stream.name}`);
    });

    // Show full hierarchy
    console.log('\n' + '='.repeat(60));
    console.log('🌳 FULL HIERARCHY VIEW\n');
    
    for (const parent of parentStreams) {
      console.log(`📁 ${parent.name}`);
      
      const { rows: children } = await client.query(
        `SELECT name, description FROM stream 
         WHERE parent_stream_id = $1 AND active = true
         ORDER BY name ASC`,
        [parent.id]
      );
      
      children.forEach((child, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const prefix = isLast ? '   └──' : '   ├──';
        console.log(`${prefix} ${child.name}`);
      });
      
      if (children.length === 0) {
        console.log('   └── (no children)');
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('\n✅ Demo completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Use GET /projects/:id/streams/parents for dropdown 1');
    console.log('   2. Use GET /streams/:parentId/children for dropdown 2');
    console.log('   3. When creating tickets, select from both dropdowns\n');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

