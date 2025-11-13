"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubjectBody = exports.CreateSubjectBody = exports.ListSubjectsQuery = void 0;
const zod_1 = require("zod");
exports.ListSubjectsQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.CreateSubjectBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
});
exports.UpdateSubjectBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    active: zod_1.z.boolean().optional(),
});
