import { FastifyInstance } from 'fastify';
import auth from './auth.routes';
import tenants from './tenants.routes';
import users from './users.routes';
import clients from './clients.routes';
import projects from './projects.routes';
import streams from './streams.routes';
import tickets from './tickets.routes';
import comments from './comments.routes';
import tags from './tags.routes';
import attachments from './attachments.routes';

export default async function registerRoutes(app: FastifyInstance) {
  await app.register(auth);
  await app.register(tenants);
  await app.register(users);
  await app.register(clients);
  await app.register(projects);
  await app.register(streams);
  await app.register(tickets);
  await app.register(comments);
  await app.register(tags);
  await app.register(attachments);
}
