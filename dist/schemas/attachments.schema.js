"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentIdParams = exports.ListAttachmentsParams = void 0;
const zod_1 = require("zod");
exports.ListAttachmentsParams = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.AttachmentIdParams = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
