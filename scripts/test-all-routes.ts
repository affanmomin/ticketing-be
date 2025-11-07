/*
 End-to-end API route smoke test.
 - Logs in with provided credentials to obtain an access token
 - Calls protected endpoints in a realistic sequence, creating small test resources
 - Skips attachment upload if S3 is not configured; still lists attachments

 Usage:
   pnpm ts-node -r dotenv/config scripts/test-all-routes.ts
 or via package.json script (added separately):
   pnpm run test:routes

 Config via ENV (or defaults below):
   API_BASE_URL (default: http://localhost:3000)
   ADMIN_EMAIL
   ADMIN_PASSWORD
   TENANT_ID
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@acme.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';
const TENANT_ID = process.env.TENANT_ID || '416f7ce3-3807-4210-81e4-8905c3ca5133';
const TEST_ATTACHMENTS = process.env.API_TEST_ATTACHMENTS === '1';

// tiny helper to sleep between calls if needed (rate limit, logs ordering)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runStep<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  process.stdout.write(`- ${label} ... `);
  try {
    const res = await fn();
    console.log('OK');
    return res;
  } catch (err: any) {
    console.log('FAIL');
    if (err?.response) {
      const { status, data } = err.response;
      console.error(`  HTTP ${status}`, JSON.stringify(data));
    } else {
      console.error('  Error:', err?.message || err);
    }
    throw err;
  }
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function main() {
  console.log(`API base: ${API_BASE_URL}`);

  const http: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    validateStatus: () => true, // let us handle errors
  });

  // 1) Login
  const login = await runStep('login', async () => {
    const body = { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, tenantId: TENANT_ID };
    const res = await http.post('/auth/login', body);
    if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
    return res.data as { accessToken: string; user: { id: string; tenantId: string; role: string; clientId?: string | null } };
  });
  if (!login) return;

  const token = login.accessToken;
  http.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  // 2) Auth sanity: /auth/me and /tenants/me
  const me = await runStep('auth:me', async () => {
    const res = await http.get('/auth/me');
    if (res.status !== 200) throw new Error(`/auth/me ${res.status}`);
    return res.data as { user: { userId: string; tenantId: string; role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT'; clientId?: string | null } };
  });
  const authedUserId = me?.user.userId!;
  const authedRole = me?.user.role!;

  await runStep('tenants:me', async () => {
    const res = await http.get('/tenants/me');
    if (res.status !== 200) throw new Error(`/tenants/me ${res.status}`);
    return res.data;
  });

  // 3) Clients
  const clientName = `Client QA ${randomSuffix()}`;
  const client = await runStep('clients:create', async () => {
    const res = await http.post('/clients', { name: clientName, domain: `qa-${randomSuffix()}.test` });
    if (res.status !== 201) throw new Error(`/clients create ${res.status}`);
    return res.data as { id: string; tenantId: string; name: string };
  });
  const clientId = client!.id;

  await runStep('clients:list', async () => {
    const res = await http.get('/clients');
    if (res.status !== 200) throw new Error(`/clients list ${res.status}`);
    return res.data;
  });

  await runStep('clients:get', async () => {
    const res = await http.get(`/clients/${clientId}`);
    if (res.status !== 200) throw new Error(`/clients/:id ${res.status}`);
    return res.data;
  });

  await runStep('clients:update', async () => {
    const res = await http.post(`/clients/${clientId}`, { domain: `updated-${randomSuffix()}.test` });
    if (res.status !== 200) throw new Error(`/clients update ${res.status}`);
    return res.data;
  });

  await runStep('clients:map-employee', async () => {
    const res = await http.post(`/clients/${clientId}/map-employee`, { userId: authedUserId });
    if (res.status !== 200) throw new Error(`/clients/:id/map-employee ${res.status}`);
    return res.data;
  });

  await runStep('users:assignable', async () => {
    const res = await http.get(`/users/assignable`, { params: { clientId } });
    if (res.status !== 200) throw new Error(`/users/assignable ${res.status}`);
    return res.data;
  });

  // 4) Projects
  const project = await runStep('projects:create', async () => {
    const res = await http.post('/projects', { clientId, name: `Project QA ${randomSuffix()}`, code: `QA${randomSuffix()}`.slice(0, 6) });
    if (res.status !== 201) throw new Error(`/projects create ${res.status}`);
    return res.data as { id: string; clientId: string; name: string };
  });
  const projectId = project!.id;

  await runStep('projects:list', async () => {
    const res = await http.get('/projects', { params: { clientId } });
    if (res.status !== 200) throw new Error(`/projects list ${res.status}`);
    return res.data;
  });

  await runStep('projects:get', async () => {
    const res = await http.get(`/projects/${projectId}`);
    if (res.status !== 200) throw new Error(`/projects/:id ${res.status}`);
    return res.data;
  });

  await runStep('projects:update', async () => {
    const res = await http.post(`/projects/${projectId}`, { name: `Project QA Updated ${randomSuffix()}` });
    if (res.status !== 200) throw new Error(`/projects update ${res.status}`);
    return res.data;
  });

  // 5) Streams
  const stream = await runStep('streams:create', async () => {
    const res = await http.post('/streams', { projectId, name: `Stream QA ${randomSuffix()}` });
    if (res.status !== 201) throw new Error(`/streams create ${res.status}`);
    return res.data as { id: string; projectId: string; name: string };
  });
  const streamId = stream!.id;

  await runStep('streams:list', async () => {
    const res = await http.get('/streams', { params: { projectId } });
    if (res.status !== 200) throw new Error(`/streams list ${res.status}`);
    return res.data;
  });

  await runStep('streams:update', async () => {
    const res = await http.post(`/streams/${streamId}`, { name: `Stream QA Updated ${randomSuffix()}` });
    if (res.status !== 200) throw new Error(`/streams update ${res.status}`);
    return res.data;
  });

  // 6) Tags
  const tag = await runStep('tags:create', async () => {
    const res = await http.post('/tags', { name: `Tag ${randomSuffix()}`, color: '#33AA77', clientId });
    if (res.status !== 201) throw new Error(`/tags create ${res.status}`);
    return res.data as { id: string; name: string };
  });
  const tagId = tag!.id;

  await runStep('tags:list', async () => {
    const res = await http.get('/tags', { params: { clientId } });
    if (res.status !== 200) throw new Error(`/tags list ${res.status}`);
    return res.data;
  });

  // 7) Tickets
  const ticket = await runStep('tickets:create', async () => {
    const res = await http.post('/tickets', {
      clientId,
      projectId,
      streamId,
      title: `Ticket QA ${randomSuffix()}`,
      descriptionMd: 'Automated test ticket',
      priority: 'P2',
      type: 'TASK',
      tagIds: [tagId],
    });
    if (res.status !== 201) throw new Error(`/tickets create ${res.status}`);
    return res.data as { id: string; title: string };
  });
  const ticketId = ticket!.id;

  await runStep('tickets:list', async () => {
    const res = await http.get('/tickets', { params: { projectId } });
    if (res.status !== 200) throw new Error(`/tickets list ${res.status}`);
    return res.data;
  });

  await runStep('tickets:get', async () => {
    const res = await http.get(`/tickets/${ticketId}`);
    if (res.status !== 200) throw new Error(`/tickets/:id ${res.status}`);
    return res.data;
  });

  await runStep('tickets:update', async () => {
    const updateBody: any = { title: `Ticket Updated ${randomSuffix()}` };
    // Only non-clients can edit status
    if (authedRole === 'ADMIN' || authedRole === 'EMPLOYEE') {
      updateBody.status = 'IN_PROGRESS';
    }
    const res = await http.post(`/tickets/${ticketId}`, updateBody);
    if (res.status !== 200) throw new Error(`/tickets update ${res.status}`);
    return res.data;
  });

  // 8) Comments
  await runStep('comments:list', async () => {
    const res = await http.get(`/tickets/${ticketId}/comments`);
    if (res.status !== 200) throw new Error(`/tickets/:id/comments ${res.status}`);
    return res.data;
  });

  await runStep('comments:add', async () => {
    const res = await http.post('/comments', { ticketId, bodyMd: 'First automated comment' });
    if (res.status !== 201) throw new Error(`/comments create ${res.status}`);
    return res.data;
  });

  // 9) Attachments
  await runStep('attachments:list', async () => {
    const res = await http.get(`/tickets/${ticketId}/attachments`);
    if (res.status !== 200) throw new Error(`/tickets/:id/attachments ${res.status}`);
    return res.data;
  });

  const s3Configured = !!(process.env.S3_REGION && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
  if (TEST_ATTACHMENTS && s3Configured) {
    await runStep('attachments:upload+delete', async () => {
      const FormData = (await import('form-data')).default as any;
      const form = new FormData();
      const fileContent = Buffer.from('Hello from test-all-routes!\n', 'utf-8');
      form.append('file', fileContent, { filename: `hello-${randomSuffix()}.txt`, contentType: 'text/plain' });
      // Note: fastify-multipart here does not attach fields to body, so pass ticketId as query param
      const headers = { ...form.getHeaders(), Authorization: `Bearer ${token}` };
      const postRes = await axios.post(`${API_BASE_URL}/attachments`, form, { headers, params: { ticketId } });
      if (postRes.status !== 201) throw new Error(`/attachments upload ${postRes.status}`);
      const att = postRes.data as { id: string };

      // Delete the uploaded attachment
      const delRes = await http.delete(`/attachments/${att.id}`);
      if (delRes.status !== 200) throw new Error(`/attachments delete ${delRes.status}`);
      return delRes.data;
    });
  } else {
    console.log(`- attachments:upload skipped (${!TEST_ATTACHMENTS ? 'API_TEST_ATTACHMENTS not enabled' : 'S3 not configured'})`);
  }

  // 10) Cleanup-ish: delete tag (only endpoint provided for tags)
  await runStep('tags:delete', async () => {
    const res = await http.delete(`/tags/${tagId}`);
    if (res.status !== 200) throw new Error(`/tags delete ${res.status}`);
    return res.data;
  });

  // 11) Logout (stateless; server returns ok)
  await runStep('auth:logout', async () => {
    const res = await http.post('/auth/logout');
    if (res.status !== 200) throw new Error(`/auth/logout ${res.status}`);
    return res.data;
  });

  console.log('\nAll steps executed.');
  await sleep(50);
}

main().catch((e) => {
  process.exitCode = 1;
});
