"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListUsersQuery = exports.ChangePasswordBody = exports.UpdateUserBody = exports.CreateClientUserBody = exports.CreateEmployeeBody = void 0;
const zod_1 = require("zod");
exports.CreateEmployeeBody = zod_1.z.object({
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8),
});
exports.CreateClientUserBody = zod_1.z.object({
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8),
    clientId: zod_1.z.string().uuid(),
});
exports.UpdateUserBody = zod_1.z.object({
    fullName: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.ChangePasswordBody = zod_1.z.object({
    password: zod_1.z.string().min(8),
});
exports.ListUsersQuery = zod_1.z.object({
    userType: zod_1.z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']).optional(),
    search: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
