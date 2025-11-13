"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAttachments = listAttachments;
exports.getPresignedUrl = getPresignedUrl;
exports.confirmAttachment = confirmAttachment;
exports.deleteAttachment = deleteAttachment;
const errors_1 = require("../utils/errors");
function listAttachments(tx, ticketId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at
     FROM ticket_attachment
     WHERE ticket_id = $1
     ORDER BY created_at DESC`, [ticketId]);
        return rows.map(r => ({
            id: r.id,
            ticketId: r.ticket_id,
            uploadedBy: r.uploaded_by,
            fileName: r.file_name,
            mimeType: r.mime_type,
            fileSize: r.file_size,
            storageUrl: r.storage_url,
            createdAt: r.created_at,
        }));
    });
}
function getPresignedUrl(ticketId, fileName, mimeType) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Integrate with S3 or preferred storage provider
        const key = `${ticketId}/${Date.now()}_${fileName}`;
        return {
            uploadUrl: `https://example-storage/presign?key=${encodeURIComponent(key)}&type=${encodeURIComponent(mimeType)}`,
            key,
        };
    });
}
function confirmAttachment(tx, ticketId, uploadedByUserId, storageUrl, fileName, mimeType, fileSize) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`INSERT INTO ticket_attachment (ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at`, [ticketId, uploadedByUserId, fileName, mimeType, fileSize, storageUrl]);
        const r = rows[0];
        return {
            id: r.id,
            ticketId: r.ticket_id,
            uploadedBy: r.uploaded_by,
            fileName: r.file_name,
            mimeType: r.mime_type,
            fileSize: r.file_size,
            storageUrl: r.storage_url,
            createdAt: r.created_at,
        };
    });
}
function deleteAttachment(tx, attachmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query('DELETE FROM ticket_attachment WHERE id = $1 RETURNING id, storage_url', [attachmentId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Attachment not found');
        // TODO: Delete from storage provider using rows[0].storage_url
    });
}
