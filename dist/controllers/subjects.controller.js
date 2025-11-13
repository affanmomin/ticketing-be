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
exports.listSubjectsCtrl = listSubjectsCtrl;
exports.getSubjectCtrl = getSubjectCtrl;
exports.createSubjectCtrl = createSubjectCtrl;
exports.updateSubjectCtrl = updateSubjectCtrl;
const pool_1 = require("../db/pool");
const subjects_service_1 = require("../services/subjects.service");
const subjects_schema_1 = require("../schemas/subjects.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
function listSubjectsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can list subjects');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const query = subjects_schema_1.ListSubjectsQuery.parse(req.query);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, subjects_service_1.listSubjects)(client, projectId, req.user.organizationId, query.limit, query.offset);
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
function getSubjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view subjects');
        const { id: subjectId } = common_schema_1.IdParam.parse(req.params);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, subjects_service_1.getSubject)(client, subjectId, req.user.organizationId);
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
function createSubjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can create subjects');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const body = subjects_schema_1.CreateSubjectBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, subjects_service_1.createSubject)(client, req.user.organizationId, projectId, body.name, (_a = body.description) !== null && _a !== void 0 ? _a : null);
            yield client.query('COMMIT');
            return reply.code(201).send(result);
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
function updateSubjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can update subjects');
        const { id: subjectId } = common_schema_1.IdParam.parse(req.params);
        const body = subjects_schema_1.UpdateSubjectBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, subjects_service_1.updateSubject)(client, subjectId, req.user.organizationId, {
                name: body.name,
                description: (_a = body.description) !== null && _a !== void 0 ? _a : null,
                active: body.active,
            });
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
