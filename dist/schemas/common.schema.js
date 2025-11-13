"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortQuery = exports.PagingQuery = exports.IdParam = void 0;
const zod_1 = require("zod");
exports.IdParam = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.PagingQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.SortQuery = zod_1.z.object({ sort: zod_1.z.string().optional() });
