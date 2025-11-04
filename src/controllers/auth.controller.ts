import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { AdminSignupBodyT, LoginBodyT, AdminSignupBody, LoginBody } from '../schemas/auth.schema';
import { pool } from '../db/pool';
import { adminSignup, login } from '../services/auth.service';

export async function signupCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = AdminSignupBody.parse(req.body);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const passwordHash = await bcrypt.hash(body.password, 10);
    const result = await adminSignup(
      client,
      body.organizationName,
      body.fullName,
      body.email,
      passwordHash
    );
    
    await client.query('COMMIT');
    
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
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function loginCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = LoginBody.parse(req.body);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await login(client, body.email, body.password);
    
    await client.query('COMMIT');
    
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
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function meCtrl(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) throw new Error('Auth required');
  
  return reply.send({
    id: req.user.userId,
    organizationId: req.user.organizationId,
    role: req.user.role,
    clientId: req.user.clientId,
    email: req.user.userId, // Placeholder, should fetch from DB in real implementation
    fullName: req.user.userId, // Placeholder
  });
}

export async function logoutCtrl(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ ok: true });
}
