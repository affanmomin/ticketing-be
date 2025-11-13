"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentActivityQuery = exports.DashboardMetricsQuery = void 0;
const zod_1 = require("zod");
exports.DashboardMetricsQuery = zod_1.z.object({
// Optional filters for future use
}).strict();
exports.RecentActivityQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20).optional(),
}).strict();
