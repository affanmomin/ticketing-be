"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentIdParams = exports.ConfirmAttachmentBody = exports.PresignAttachmentBody = exports.ListAttachmentsParams = void 0;
const zod_1 = require("zod");
exports.ListAttachmentsParams = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.PresignAttachmentBody = zod_1.z.object({
    fileName: zod_1.z.string().min(1).max(255),
    mimeType: zod_1.z.string().min(1).max(255),
});
exports.ConfirmAttachmentBody = zod_1.z.object({
    storageUrl: zod_1.z.string().url(),
    fileName: zod_1.z.string().min(1).max(255),
    mimeType: zod_1.z.string().min(1).max(255),
    fileSize: zod_1.z.coerce.number().int().min(0),
});
exports.AttachmentIdParams = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
