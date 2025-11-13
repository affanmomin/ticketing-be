"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusResponse = exports.PriorityResponse = void 0;
const zod_1 = require("zod");
exports.PriorityResponse = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    rank: zod_1.z.number().int(),
    colorHex: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.StatusResponse = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    isClosed: zod_1.z.boolean(),
    sequence: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
