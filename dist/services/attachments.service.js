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
exports.uploadAttachment = uploadAttachment;
exports.getAttachmentData = getAttachmentData;
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
function uploadAttachment(tx, ticketId, uploadedByUserId, fileName, mimeType, fileData) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileSize = fileData.length;
        const { rows } = yield tx.query(`INSERT INTO ticket_attachment (ticket_id, uploaded_by, file_name, mime_type, file_size, file_data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, created_at`, [ticketId, uploadedByUserId, fileName, mimeType, fileSize, fileData]);
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
function getAttachmentData(tx, attachmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, ticket_id, uploaded_by, file_name, mime_type, file_size, storage_url, file_data, created_at
     FROM ticket_attachment
     WHERE id = $1`, [attachmentId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Attachment not found');
        const r = rows[0];
        if (!r.file_data) {
            throw (0, errors_1.notFound)('Attachment file data not found');
        }
        return {
            id: r.id,
            ticketId: r.ticket_id,
            uploadedBy: r.uploaded_by,
            fileName: r.file_name,
            mimeType: r.mime_type,
            fileSize: r.file_size,
            storageUrl: r.storage_url,
            fileData: r.file_data,
            createdAt: r.created_at,
        };
    });
}
function deleteAttachment(tx, attachmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query('DELETE FROM ticket_attachment WHERE id = $1 RETURNING id', [attachmentId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Attachment not found');
        // File data is automatically deleted with the row (CASCADE handled by DB)
    });
}
