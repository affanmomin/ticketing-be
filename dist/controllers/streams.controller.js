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
exports.listStreamsCtrl = listStreamsCtrl;
exports.getStreamCtrl = getStreamCtrl;
exports.createStreamCtrl = createStreamCtrl;
exports.updateStreamCtrl = updateStreamCtrl;
exports.listParentStreamsCtrl = listParentStreamsCtrl;
exports.listChildStreamsCtrl = listChildStreamsCtrl;
const pool_1 = require("../db/pool");
const streams_service_1 = require("../services/streams.service");
const streams_schema_1 = require("../schemas/streams.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
/**
 * GET /projects/:id/streams - List streams for a project (ADMIN only)
 */
function listStreamsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const query = streams_schema_1.ListStreamsQuery.parse(req.query);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.listStreams)(client, projectId, req.user.organizationId, query.limit, query.offset);
            yield client.query('COMMIT');
            return reply.send(result);
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
 * GET /streams/:id - Get single stream (ADMIN only)
 */
function getStreamCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view streams');
        const { id: streamId } = common_schema_1.IdParam.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.getStream)(client, streamId, req.user.organizationId);
            yield client.query('COMMIT');
            return reply.send(result);
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
 * POST /projects/:id/streams - Create stream (ADMIN only)
 */
function createStreamCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create streams');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const body = streams_schema_1.CreateStreamBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.createStream)(client, req.user.organizationId, projectId, body.name, (_a = body.description) !== null && _a !== void 0 ? _a : null, (_b = body.parentStreamId) !== null && _b !== void 0 ? _b : null);
            yield client.query('COMMIT');
            return reply.code(201).send(result);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_c) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
/**
 * PATCH /streams/:id - Update stream (ADMIN only)
 */
function updateStreamCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update streams');
        const { id: streamId } = common_schema_1.IdParam.parse(req.params);
        const body = streams_schema_1.UpdateStreamBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.updateStream)(client, streamId, req.user.organizationId, {
                name: body.name,
                description: (_a = body.description) !== null && _a !== void 0 ? _a : null,
                active: body.active,
                parentStreamId: (_b = body.parentStreamId) !== null && _b !== void 0 ? _b : null,
            });
            yield client.query('COMMIT');
            return reply.send(result);
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_c) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
/**
 * GET /projects/:id/streams/parents - List parent streams only (ADMIN only)
 * For first dropdown
 */
function listParentStreamsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.listParentStreams)(client, projectId, req.user.organizationId);
            yield client.query('COMMIT');
            return reply.send(result);
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
 * GET /streams/:id/children - List child streams for a parent (ADMIN only)
 * For second dropdown
 */
function listChildStreamsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list streams');
        const { id: parentStreamId } = common_schema_1.IdParam.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, streams_service_1.listChildStreams)(client, parentStreamId, req.user.organizationId);
            yield client.query('COMMIT');
            return reply.send(result);
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
