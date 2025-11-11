import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { AdminSignupBodyT, LoginBodyT, AdminSignupBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from '../schemas/auth.schema';
import { adminSignup, login, requestPasswordReset, resetPassword } from '../services/auth.service';
import { withReadOnly, withTransaction } from '../db/helpers';
import { emailService } from '../services/email.service';

export async function signupCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = AdminSignupBody.parse(req.body);

  const passwordHash = await bcrypt.hash(body.password, 10);
  const result = await withTransaction(async (dbClient) => {
    return await adminSignup(
      dbClient,
      body.organizationName,
      body.fullName,
      body.email,
      passwordHash
    );
  });

  const token = await (req.server as any).jwt.sign({
    sub: result.userId,
    organizationId: result.organizationId,
    role: result.role,
    clientId: result.clientId,
  });

  return reply.send({
    accessToken: token,
    user: {
      id: result.userId,
      organizationId: result.organizationId,
      role: result.role,
      clientId: result.clientId,
      email: result.email,
      fullName: result.fullName,
    },
  });
}

export async function loginCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = LoginBody.parse(req.body);

  // Login is read-only (just verifying credentials), but we keep transaction for consistency
  // since it might update last_login or similar in the future
  const result = await withReadOnly(async (dbClient) => {
    return await login(dbClient, body.email, body.password);
  });

  const token = await (req.server as any).jwt.sign({
    sub: result.userId,
    organizationId: result.organizationId,
    role: result.role,
    clientId: result.clientId,
  });

  return reply.send({
    accessToken: token,
    user: {
      id: result.userId,
      organizationId: result.organizationId,
      role: result.role,
      clientId: result.clientId,
      email: result.email,
      fullName: result.fullName,
    },
  });
}

export async function meCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw new Error('Auth required');

  // Read-only operation - no transaction needed
  const { getUserById } = await import('../services/auth.service');
  const user = await withReadOnly(async (dbClient) => {
    return await getUserById(dbClient, req.user!.userId);
  });

  return reply.send({
    id: user.userId,
    organizationId: user.organizationId,
    role: user.role,
    clientId: user.clientId,
    email: user.email,
    fullName: user.fullName,
  });
}

export async function logoutCtrl(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ ok: true });
}

/**
 * POST /auth/forgot-password - Request password reset
 */
export async function forgotPasswordCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = ForgotPasswordBody.parse(req.body);

  const result = await withTransaction(async (dbClient) => {
    return await requestPasswordReset(dbClient, body.email);
  });

  // Only send email if user exists (result is not null)
  if (result) {
    await emailService.sendPasswordResetEmail(result.email, result.fullName, result.token);
  }

  // Always return the same message to prevent email enumeration
  return reply.send({
    message: 'If an account exists with this email, a password reset link has been sent.'
  });
}

/**
 * POST /auth/reset-password - Reset password with token
 */
export async function resetPasswordCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = ResetPasswordBody.parse(req.body);

  await withTransaction(async (dbClient) => {
    return await resetPassword(dbClient, body.token, body.password);
  });

  return reply.send({
    message: 'Password has been reset successfully. You can now log in with your new password.'
  });
}
