"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTicketBody = exports.CreateTicketBody = exports.ListTicketsQuery = void 0;
const zod_1 = require("zod");
exports.ListTicketsQuery = zod_1.z.object({
    projectId: zod_1.z.string().uuid().optional(),
    statusId: zod_1.z.string().uuid().optional(),
    priorityId: zod_1.z.string().uuid().optional(),
    assigneeId: zod_1.z.string().uuid().optional(),
    from: zod_1.z.string().datetime({ offset: true }).optional(),
    to: zod_1.z.string().datetime({ offset: true }).optional(),
    q: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.CreateTicketBody = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    streamId: zod_1.z.string().uuid(),
    subjectId: zod_1.z.string().uuid(),
    priorityId: zod_1.z.string().uuid(),
    statusId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(255),
    descriptionMd: zod_1.z.string().optional(),
    assignedToUserId: zod_1.z.string().uuid().optional(),
});
exports.UpdateTicketBody = zod_1.z.object({
    statusId: zod_1.z.string().uuid().optional(),
    priorityId: zod_1.z.string().uuid().optional(),
    assignedToUserId: zod_1.z.string().uuid().nullable().optional(),
    title: zod_1.z.string().min(1).max(255).optional(),
    descriptionMd: zod_1.z.string().optional(),
});
