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
exports.listPendingOutboxCtrl = listPendingOutboxCtrl;
exports.processOutboxCtrl = processOutboxCtrl;
const pool_1 = require("../db/pool");
const outbox_service_1 = require("../services/outbox.service");
const outbox_schema_1 = require("../schemas/outbox.schema");
const errors_1 = require("../utils/errors");
function listPendingOutboxCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can access outbox');
        const query = outbox_schema_1.ListOutboxQuery.parse(req.query);
        const client = yield pool_1.pool.connect();
        try {
            const result = yield (0, outbox_service_1.listPendingNotifications)(client, query.limit);
            return reply.send(result);
        }
        finally {
            client.release();
        }
    });
}
function processOutboxCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can process outbox');
        const body = outbox_schema_1.ProcessOutboxBody.parse((_a = req.body) !== null && _a !== void 0 ? _a : {});
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, outbox_service_1.processPendingNotifications)(client, body.limit);
            yield client.query('COMMIT');
            return reply.send(result);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_b) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
