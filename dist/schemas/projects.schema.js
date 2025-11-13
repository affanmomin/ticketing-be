"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMemberParams = exports.UpdateProjectMemberBody = exports.AddProjectMemberBody = exports.UpdateProjectBody = exports.CreateProjectBody = exports.ListProjectsQuery = void 0;
const zod_1 = require("zod");
exports.ListProjectsQuery = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    active: zod_1.z.boolean().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
const isoDate = zod_1.z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
exports.CreateProjectBody = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
});
exports.UpdateProjectBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    active: zod_1.z.boolean().optional(),
});
exports.AddProjectMemberBody = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['MEMBER', 'MANAGER', 'VIEWER']).default('MEMBER'),
    canRaise: zod_1.z.boolean().default(false),
    canBeAssigned: zod_1.z.boolean().default(false),
});
exports.UpdateProjectMemberBody = zod_1.z.object({
    role: zod_1.z.enum(['MEMBER', 'MANAGER', 'VIEWER']).optional(),
    canRaise: zod_1.z.boolean().optional(),
    canBeAssigned: zod_1.z.boolean().optional(),
});
exports.ProjectMemberParams = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
});
