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
exports.listClientsCtrl = listClientsCtrl;
exports.getClientCtrl = getClientCtrl;
exports.createClientCtrl = createClientCtrl;
exports.updateClientCtrl = updateClientCtrl;
const clients_service_1 = require("../services/clients.service");
const clients_schema_1 = require("../schemas/clients.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
const email_service_1 = require("../services/email.service");
const helpers_1 = require("../db/helpers");
/**
 * GET /clients - List clients in organization (ADMIN only)
 * Read-only operation - no transaction needed
 */
function listClientsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const query = clients_schema_1.ListClientsQuery.parse(req.query);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, clients_service_1.listClients)(client, req.user.organizationId, query.limit, query.offset);
        }));
        return reply.send(result);
    });
}
/**
 * GET /clients/:id - Get single client (ADMIN only)
 * Read-only operation - no transaction needed
 */
function getClientCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view clients');
        const { id: clientId } = common_schema_1.IdParam.parse(req.params);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, clients_service_1.getClient)(client, clientId, req.user.organizationId);
        }));
        return reply.send(result);
    });
}
/**
 * POST /clients - Create client (ADMIN only)
 * Write operation - transaction required
 */
function createClientCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can create clients');
        const body = clients_schema_1.CreateClientBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            return yield (0, clients_service_1.createClient)(client, req.user.organizationId, body.name, (_a = body.email) !== null && _a !== void 0 ? _a : null, (_b = body.phone) !== null && _b !== void 0 ? _b : null, (_c = body.address) !== null && _c !== void 0 ? _c : null);
        }));
        // Send notification email if client has an email (outside transaction)
        if (result.email) {
            yield email_service_1.emailService.sendClientNotificationEmail(result.name, result.email);
        }
        return reply.code(201).send(result);
    });
}
/**
 * PATCH /clients/:id - Update client (ADMIN only)
 * Write operation - transaction required
 */
function updateClientCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can update clients');
        const { id: clientId } = common_schema_1.IdParam.parse(req.params);
        const body = clients_schema_1.UpdateClientBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            return yield (0, clients_service_1.updateClient)(client, clientId, req.user.organizationId, {
                name: body.name,
                email: (_a = body.email) !== null && _a !== void 0 ? _a : null,
                phone: (_b = body.phone) !== null && _b !== void 0 ? _b : null,
                address: (_c = body.address) !== null && _c !== void 0 ? _c : null,
                active: body.active,
            });
        }));
        return reply.send(result);
    });
}
