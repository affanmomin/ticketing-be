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
exports.listTicketsCtrl = listTicketsCtrl;
exports.getTicketCtrl = getTicketCtrl;
exports.createTicketCtrl = createTicketCtrl;
exports.updateTicketCtrl = updateTicketCtrl;
exports.deleteTicketCtrl = deleteTicketCtrl;
const tickets_service_1 = require("../services/tickets.service");
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
 * POST /tickets - Create ticket
 * Write operation - transaction required
 */
function createTicketCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const body = tickets_schema_1.CreateTicketBody.parse(req.body);
        const ticket = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            return yield (0, tickets_service_1.createTicket)(client, body.projectId, req.user.userId, body.streamId, body.subjectId, body.priorityId, body.statusId, body.title, (_a = body.descriptionMd) !== null && _a !== void 0 ? _a : null, (_b = body.assignedToUserId) !== null && _b !== void 0 ? _b : null);
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
