import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import {
  listAssignableUsers,
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
} from '../services/users.service';
import { CreateUserBody, UpdateUserBody, ListUsersQuery } from '../schemas/users.schema';
import { forbidden } from '../utils/errors';
import { emailService } from '../services/email.service';

/**
 * GET /users/assignable?clientId=xxx
 * List assignable users for a specific client
 */
export async function usersAssignableCtrl(req: FastifyRequest, reply: FastifyReply) {
  const clientId = (req.query as any).clientId as string;
  return withRlsTx(req, async (tx) => reply.send(await listAssignableUsers(tx, clientId)));
}

/**
 * POST /users
 * Create a new user (admin only)
 */
export async function createUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  // Only ADMIN can create users
  if (req.auth?.role !== 'ADMIN') {
    throw forbidden('Only admins can create users');
  }

  const body = CreateUserBody.parse(req.body);
  // Use the tenantId from the body (which should match the authenticated user's tenant for security)

  return withRlsTx(req, async (tx) => {
    const user = await createUser(tx, body, req.auth!.tenantId);
    
    // Send welcome email after successful user creation
    // Note: We're not awaiting this to avoid blocking the response
    // The email service handles errors internally
    emailService.sendWelcomeEmail({
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      password: body.password, // Include original password for auto-fill
      tenantId: req.auth!.tenantId, // Use the same tenantId used for creating the user
    }).catch(error => {
      console.error('Failed to send welcome email:', error);
    });
    
    return reply.code(201).send(user);
  });
}

/**
 * GET /users
 * List users with filtering and pagination
 */
export async function listUsersCtrl(req: FastifyRequest, reply: FastifyReply) {
  // Only ADMIN and EMPLOYEE can list users
  if (req.auth?.role === 'CLIENT') {
    throw forbidden('Clients cannot list users');
  }

  const query = ListUsersQuery.parse(req.query);
  const tenantId = req.auth!.tenantId;

  return withRlsTx(req, async (tx) => {
    const result = await listUsers(tx, query, tenantId);
    return reply.send(result);
  });
}

/**
 * GET /users/:id
 * Get a single user by ID
 */
export async function getUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const tenantId = req.auth!.tenantId;

  // Users can view their own profile, admins can view anyone
  if (req.auth?.role === 'CLIENT' && req.auth?.userId !== id) {
    throw forbidden('You can only view your own profile');
  }

  return withRlsTx(req, async (tx) => {
    const user = await getUser(tx, id, tenantId);
    return reply.send(user);
  });
}

/**
 * PUT /users/:id
 * Update a user (admin only, or users can update their own basic info)
 */
export async function updateUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const body = UpdateUserBody.parse(req.body);
  const tenantId = req.auth!.tenantId;

  // Only ADMIN can update any user, or users can update themselves (limited fields)
  if (req.auth?.role !== 'ADMIN' && req.auth?.userId !== id) {
    throw forbidden('You can only update your own profile');
  }

  // Non-admins can only update name, email, and password (not userType, clientCompanyId, or active)
  if (req.auth?.role !== 'ADMIN') {
    if (body.userType || body.clientCompanyId !== undefined || body.active !== undefined) {
      throw forbidden('You cannot update userType, clientCompanyId, or active status');
    }
  }

  return withRlsTx(req, async (tx) => {
    const user = await updateUser(tx, id, body, tenantId);
    return reply.send(user);
  });
}

/**
 * DELETE /users/:id
 * Delete a user (admin only)
 */
export async function deleteUserCtrl(req: FastifyRequest, reply: FastifyReply) {
  // Only ADMIN can delete users
  if (req.auth?.role !== 'ADMIN') {
    throw forbidden('Only admins can delete users');
  }

  const { id } = req.params as { id: string };
  const tenantId = req.auth!.tenantId;
  const hard = (req.query as any).hard === 'true';

  return withRlsTx(req, async (tx) => {
    const result = await deleteUser(tx, id, tenantId, hard);
    return reply.send(result);
  });
}
