"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStreamBody = exports.CreateStreamBody = exports.ListStreamsQuery = void 0;
const zod_1 = require("zod");
exports.ListStreamsQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.CreateStreamBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
    parentStreamId: zod_1.z.string().uuid().optional(),
});
exports.UpdateStreamBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    active: zod_1.z.boolean().optional(),
    parentStreamId: zod_1.z.string().uuid().optional(),
});
