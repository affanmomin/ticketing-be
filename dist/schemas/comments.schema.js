"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCommentBody = void 0;
const zod_1 = require("zod");
exports.CreateCommentBody = zod_1.z.object({
    visibility: zod_1.z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
    bodyMd: zod_1.z.string().min(1),
});
