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
exports.listAttachmentsCtrl = listAttachmentsCtrl;
exports.uploadAttachmentCtrl = uploadAttachmentCtrl;
exports.downloadAttachmentCtrl = downloadAttachmentCtrl;
exports.deleteAttachmentCtrl = deleteAttachmentCtrl;
const pool_1 = require("../db/pool");
const attachments_service_1 = require("../services/attachments.service");
const attachments_schema_1 = require("../schemas/attachments.schema");
const errors_1 = require("../utils/errors");
/**
 * GET /tickets/:id/attachments
 */
function listAttachmentsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = attachments_schema_1.ListAttachmentsParams.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const attachments = yield (0, attachments_service_1.listAttachments)(client, ticketId);
            yield client.query('COMMIT');
            return reply.send(attachments);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
/**
 * POST /tickets/:id/attachments
 * Upload a file attachment directly to the database
 */
function uploadAttachmentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = attachments_schema_1.ListAttachmentsParams.parse(req.params);
        const data = yield req.file();
        if (!data) {
            throw (0, errors_1.badRequest)('No file provided');
        }
        const fileData = yield data.toBuffer();
        const fileName = data.filename || 'unnamed';
        const mimeType = data.mimetype || 'application/octet-stream';
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const attachment = yield (0, attachments_service_1.uploadAttachment)(client, ticketId, req.user.userId, fileName, mimeType, fileData);
            yield client.query('COMMIT');
            return reply.code(201).send(attachment);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
/**
 * GET /attachments/:id/download
 * Download an attachment file
 */
function downloadAttachmentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: attachmentId } = attachments_schema_1.AttachmentIdParams.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const attachment = yield (0, attachments_service_1.getAttachmentData)(client, attachmentId);
            yield client.query('COMMIT');
            reply.header('Content-Type', attachment.mimeType);
            reply.header('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
            reply.header('Content-Length', attachment.fileSize.toString());
            return reply.send(attachment.fileData);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
/**
 * DELETE /attachments/:id
 */
function deleteAttachmentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: attachmentId } = attachments_schema_1.AttachmentIdParams.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            yield (0, attachments_service_1.deleteAttachment)(client, attachmentId);
            yield client.query('COMMIT');
            return reply.status(204).send();
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
