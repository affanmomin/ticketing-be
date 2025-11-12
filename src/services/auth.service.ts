import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { badRequest, unauthorized, forbidden } from '../utils/errors';
import { Role } from '../types/common';

export interface CreateUserPayload {
  organizationId: string;
  userType: Role;
  email: string;
  fullName: string;
  passwordHash: string;
  clientId?: string | null;
}

export interface LoginResult {
  userId: string;
  organizationId: string;
  role: Role;
  clientId: string | null;
  email: string;
  fullName: string;
}

/**
 * Admin signup: creates organization + admin user
 */
export async function adminSignup(
  tx: PoolClient,
  organizationName: string,
  fullName: string,
  email: string,
  passwordHash: string
): Promise<LoginResult> {
  // Check email uniqueness
  const { rows: existing } = await tx.query(
    'SELECT id FROM app_user WHERE email = $1',
    [email]
  );
  if (existing.length > 0) throw badRequest('Email already in use');

  // Create organization
  const { rows: orgRows } = await tx.query(
    'INSERT INTO organization (name) VALUES ($1) RETURNING id',
    [organizationName]
  );
  const orgId = orgRows[0].id;

  // Create admin user
  const { rows: userRows } = await tx.query(
    `INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`,
    [orgId, 'ADMIN', email, fullName, passwordHash]
  );
  const userId = userRows[0].id;

  return {
    userId,
    organizationId: orgId,
    role: 'ADMIN',
    clientId: null,
    email,
    fullName,
  };
}

/**
 * Login: verify credentials and return JWT payload
 */
export async function login(tx: PoolClient, email: string, password: string): Promise<LoginResult> {
  const { rows: users } = await tx.query(
    'SELECT id, organization_id, user_type, full_name, email, password_hash, client_id FROM app_user WHERE email = $1 AND is_active = true',
    [email]
  );

  if (users.length === 0) throw unauthorized('Invalid credentials');
  const user = users[0];

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) throw unauthorized('Invalid credentials');

  // For CLIENT users, use their client_id from the user record
  // For internal users (ADMIN/EMPLOYEE), client_id should be null
  let clientId: string | null = user.client_id || null;
  if (user.user_type === 'CLIENT' && !clientId) {
    throw badRequest('Client user has no associated client');
  }
  if ((user.user_type === 'ADMIN' || user.user_type === 'EMPLOYEE') && clientId) {
    throw badRequest('Internal user should not have a client_id');
  }

  return {
    userId: user.id,
    organizationId: user.organization_id,
    role: user.user_type as Role,
    clientId,
    email: user.email,
    fullName: user.full_name,
  };
}

/**
 * Create a user (ADMIN creates EMPLOYEE or CLIENT)
 */
export async function createUser(tx: PoolClient, payload: CreateUserPayload): Promise<LoginResult> {
  // Validate role/client_id semantics
  if (payload.userType === 'ADMIN' || payload.userType === 'EMPLOYEE') {
    if (payload.clientId !== null && payload.clientId !== undefined) {
      throw badRequest(`${payload.userType} users must have client_id = NULL`);
    }
    payload.clientId = null;
  } else if (payload.userType === 'CLIENT') {
    if (!payload.clientId) throw badRequest('CLIENT user must have a valid client_id');
    // Verify client belongs to same org
    const { rows: clientRows } = await tx.query(
      'SELECT id FROM client WHERE id = $1 AND organization_id = $2',
      [payload.clientId, payload.organizationId]
    );
    if (clientRows.length === 0) throw forbidden('Client does not belong to organization');
  }

  // Check email uniqueness
  const { rows: existing } = await tx.query(
    'SELECT id FROM app_user WHERE email = $1',
    [payload.email]
  );
  if (existing.length > 0) throw badRequest('Email already in use');

  // Insert user
  const { rows: userRows } = await tx.query(
    `INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [payload.organizationId, payload.clientId || null, payload.userType, payload.email, payload.fullName, payload.passwordHash]
  );
  const userId = userRows[0].id;

  return {
    userId,
    organizationId: payload.organizationId,
    role: payload.userType,
    clientId: payload.clientId || null,
    email: payload.email,
    fullName: payload.fullName,
  };
}

/**
 * Get user by ID with organization and client info
 */
export async function getUserById(tx: PoolClient, userId: string): Promise<LoginResult> {
  const { rows: users } = await tx.query(
    `SELECT id, organization_id, user_type, email, full_name, client_id
     FROM app_user WHERE id = $1`,
    [userId]
  );
  if (users.length === 0) throw unauthorized('User not found');

  const user = users[0];
  return {
    userId: user.id,
    organizationId: user.organization_id,
    role: user.user_type as Role,
    clientId: user.client_id || null,
    email: user.email,
    fullName: user.full_name,
  };
}

/**
 * Request password reset: create token and return user info
 */
export async function requestPasswordReset(
  tx: PoolClient,
  email: string
): Promise<{ userId: string; email: string; fullName: string; token: string } | null> {
  // Find user by email
  const { rows: users } = await tx.query(
    'SELECT id, email, full_name FROM app_user WHERE email = $1 AND is_active = true',
    [email]
  );

  // If user doesn't exist, return null (controller will handle the response)
  // This prevents email enumeration attacks
  if (users.length === 0) {
    return null;
  }

  const user = users[0];

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Invalidate any existing unused tokens for this user
  await tx.query(
    'UPDATE password_reset_token SET used = true WHERE user_id = $1 AND used = false',
    [user.id]
  );

  // Create new reset token
  await tx.query(
    'INSERT INTO password_reset_token (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );

  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    token,
  };
}

/**
 * Reset password: validate token and update password
 */
export async function resetPassword(
  tx: PoolClient,
  token: string,
  newPassword: string
): Promise<void> {
  // Find valid token
  const { rows: tokenRows } = await tx.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
     FROM password_reset_token prt
     WHERE prt.token = $1`,
    [token]
  );

  if (tokenRows.length === 0) {
    throw badRequest('Invalid or expired reset token');
  }

  const tokenData = tokenRows[0];

  // Check if token is already used
  if (tokenData.used) {
    throw badRequest('This reset token has already been used');
  }

  // Check if token is expired
  const now = new Date();
  if (new Date(tokenData.expires_at) < now) {
    throw badRequest('This reset token has expired');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await tx.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    tokenData.user_id,
  ]);

  // Mark token as used
  await tx.query('UPDATE password_reset_token SET used = true WHERE id = $1', [tokenData.id]);
}
