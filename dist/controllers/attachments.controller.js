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
exports.presignAttachmentCtrl = presignAttachmentCtrl;
exports.confirmAttachmentCtrl = confirmAttachmentCtrl;
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
 * POST /tickets/:id/attachments/presign
 */
function presignAttachmentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = attachments_schema_1.ListAttachmentsParams.parse(req.params);
        const body = attachments_schema_1.PresignAttachmentBody.parse(req.body);
        const presign = yield (0, attachments_service_1.getPresignedUrl)(ticketId, body.fileName, body.mimeType);
        return reply.send(presign);
    });
}
/**
 * POST /tickets/:id/attachments/confirm
 */
function confirmAttachmentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = attachments_schema_1.ListAttachmentsParams.parse(req.params);
        const body = attachments_schema_1.ConfirmAttachmentBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const attachment = yield (0, attachments_service_1.confirmAttachment)(client, ticketId, req.user.userId, body.storageUrl, body.fileName, body.mimeType, body.fileSize);
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
