"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessOutboxBody = exports.ListOutboxQuery = void 0;
const zod_1 = require("zod");
exports.ListOutboxQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(100),
});
exports.ProcessOutboxBody = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
});
