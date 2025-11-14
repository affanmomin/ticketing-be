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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTicketsCtrl = listTicketsCtrl;
exports.getTicketCtrl = getTicketCtrl;
exports.createTicketCtrl = createTicketCtrl;
exports.updateTicketCtrl = updateTicketCtrl;
exports.deleteTicketCtrl = deleteTicketCtrl;
const tickets_service_1 = require("../services/tickets.service");
const attachments_service_1 = require("../services/attachments.service");
const tickets_schema_1 = require("../schemas/tickets.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
const helpers_1 = require("../db/helpers");
/**
 * GET /tickets - List tickets with role-based scoping
 * Read-only operation - no transaction needed
 */
function listTicketsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const query = tickets_schema_1.ListTicketsQuery.parse(req.query);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, tickets_service_1.listTickets)(client, req.user.organizationId, req.user.role, req.user.userId, (_a = req.user.clientId) !== null && _a !== void 0 ? _a : null, {
                projectId: query.projectId,
                statusId: query.statusId,
                priorityId: query.priorityId,
                assigneeId: query.assigneeId,
            }, query.limit, query.offset);
        }));
        return reply.send(result);
    });
}
/**
 * GET /tickets/:id - Get ticket details (scoped by role)
 * Read-only operation - no transaction needed
 */
function getTicketCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = common_schema_1.IdParam.parse(req.params);
        const ticket = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, tickets_service_1.getTicket)(client, ticketId, req.user.role, req.user.userId, (_a = req.user.clientId) !== null && _a !== void 0 ? _a : null);
        }));
        return reply.send(ticket);
    });
}
/**
 * POST /tickets - Create ticket (with optional attachments)
 * Write operation - transaction required
 * Supports both JSON and multipart/form-data
 */
function createTicketCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // Check if this is multipart/form-data (has files) or JSON
        const contentType = req.headers['content-type'] || '';
        const isMultipart = contentType.includes('multipart/form-data');
        let ticketData;
        const attachments = [];
        if (isMultipart && req.parts) {
            // Handle multipart/form-data
            const parts = req.parts();
            const formFields = {};
            try {
                for (var _d = true, parts_1 = __asyncValues(parts), parts_1_1; parts_1_1 = yield parts_1.next(), _a = parts_1_1.done, !_a; _d = true) {
                    _c = parts_1_1.value;
                    _d = false;
                    const part = _c;
                    if (part.type === 'file') {
                        // Handle file attachment
                        const fileData = yield part.toBuffer();
                        attachments.push({
                            fileName: part.filename || 'unnamed',
                            mimeType: part.mimetype || 'application/octet-stream',
                            data: fileData,
                        });
                    }
                    else {
                        // Handle form field
                        formFields[part.fieldname] = part.value;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = parts_1.return)) yield _b.call(parts_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Validate and parse form fields
            ticketData = tickets_schema_1.CreateTicketBody.parse({
                projectId: formFields.projectId,
                streamId: formFields.streamId,
                subjectId: formFields.subjectId,
                priorityId: formFields.priorityId,
                statusId: formFields.statusId,
                title: formFields.title,
                descriptionMd: formFields.descriptionMd || undefined,
                assignedToUserId: formFields.assignedToUserId || undefined,
            });
        }
        else {
            // Handle JSON body (backward compatible)
            ticketData = tickets_schema_1.CreateTicketBody.parse(req.body);
        }
        const ticket = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Create the ticket first
            const createdTicket = yield (0, tickets_service_1.createTicket)(client, ticketData.projectId, req.user.userId, ticketData.streamId, ticketData.subjectId, ticketData.priorityId, ticketData.statusId, ticketData.title, (_a = ticketData.descriptionMd) !== null && _a !== void 0 ? _a : null, (_b = ticketData.assignedToUserId) !== null && _b !== void 0 ? _b : null);
            // Upload attachments if any
            const uploadedAttachments = [];
            for (const attachment of attachments) {
                const uploaded = yield (0, attachments_service_1.uploadAttachment)(client, createdTicket.id, req.user.userId, attachment.fileName, attachment.mimeType, attachment.data);
                uploadedAttachments.push(uploaded);
            }
            return Object.assign(Object.assign({}, createdTicket), { attachments: uploadedAttachments });
        }));
        return reply.code(201).send(ticket);
    });
}
/**
 * PATCH /tickets/:id - Update ticket
 * Write operation - transaction required
 */
function updateTicketCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = common_schema_1.IdParam.parse(req.params);
        const body = tickets_schema_1.UpdateTicketBody.parse(req.body);
        const ticket = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, tickets_service_1.updateTicket)(client, ticketId, {
                statusId: body.statusId,
                priorityId: body.priorityId,
                assignedToUserId: (_a = body.assignedToUserId) !== null && _a !== void 0 ? _a : undefined,
                title: body.title,
                descriptionMd: body.descriptionMd,
            }, req.user.userId);
        }));
        return reply.send(ticket);
    });
}
/**
 * DELETE /tickets/:id - Soft delete ticket (ADMIN only for now)
 * Write operation - transaction required
 */
function deleteTicketCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
            throw (0, errors_1.forbidden)('Only internal users can delete tickets');
        }
        const { id: ticketId } = common_schema_1.IdParam.parse(req.params);
        yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            yield (0, tickets_service_1.deleteTicket)(client, ticketId, req.user.userId);
        }));
        return reply.status(204).send();
    });
}
