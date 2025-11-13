"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordBody = exports.ForgotPasswordBody = exports.MeResponse = exports.LoginResponse = exports.LoginBody = exports.AdminSignupBody = void 0;
const zod_1 = require("zod");
exports.AdminSignupBody = zod_1.z.object({
    organizationName: zod_1.z.string().min(1).max(255),
    fullName: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
exports.LoginBody = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.LoginResponse = zod_1.z.object({
    accessToken: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        organizationId: zod_1.z.string().uuid(),
        role: zod_1.z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']),
        clientId: zod_1.z.string().uuid().nullable(),
        email: zod_1.z.string().email(),
        fullName: zod_1.z.string(),
    }),
});
exports.MeResponse = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']),
    clientId: zod_1.z.string().uuid().nullable(),
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string(),
});
exports.ForgotPasswordBody = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.ResetPasswordBody = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8),
});
