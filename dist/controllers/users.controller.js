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
exports.listUsersCtrl = listUsersCtrl;
exports.getUserCtrl = getUserCtrl;
exports.createEmployeeCtrl = createEmployeeCtrl;
exports.createClientUserCtrl = createClientUserCtrl;
exports.updateUserCtrl = updateUserCtrl;
exports.changePasswordCtrl = changePasswordCtrl;
const pool_1 = require("../db/pool");
const users_service_1 = require("../services/users.service");
const users_schema_1 = require("../schemas/users.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
const email_service_1 = require("../services/email.service");
/**
 * GET /users - List users in organization (ADMIN/EMPLOYEE only)
 */
function listUsersCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
        //   throw forbidden('Only internal users can list users');
        // }
        const query = users_schema_1.ListUsersQuery.parse(req.query);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, users_service_1.listUsers)(client, req.user.organizationId, {
                userType: query.userType,
                search: query.search,
                isActive: query.isActive,
            }, query.limit, query.offset);
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
 * GET /users/:id - Get single user by ID
 */
function getUserCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: userId } = common_schema_1.IdParam.parse(req.params);
        // Self-access or admin
        // if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
        //   throw forbidden('Can only view own profile');
        // }
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, users_service_1.getUserById)(client, userId, req.user.organizationId);
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
 * POST /employees - Create EMPLOYEE user (ADMIN only)
 */
function createEmployeeCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can create employees');
        const body = users_schema_1.CreateEmployeeBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, users_service_1.createEmployee)(client, req.user.organizationId, body.email, body.fullName, body.password);
            yield client.query('COMMIT');
            // Send welcome email with login credentials
            yield email_service_1.emailService.sendWelcomeEmail({
                id: result.id,
                email: result.email,
                name: result.fullName,
                userType: result.userType,
                password: body.password,
            });
            return reply.code(201).send(result);
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
 * POST /client-users - Create CLIENT user (ADMIN only)
 */
function createClientUserCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can create client users');
        const body = users_schema_1.CreateClientUserBody.parse(req.body);
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, users_service_1.createClientUser)(client, req.user.organizationId, body.clientId, body.email, body.fullName, body.password);
            yield client.query('COMMIT');
            // Send welcome email with login credentials
            yield email_service_1.emailService.sendWelcomeEmail({
                id: result.id,
                email: result.email,
                name: result.fullName,
                userType: result.userType,
                password: body.password,
            });
            return reply.code(201).send(result);
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
 * PATCH /users/:id - Update user (ADMIN or self-update)
 */
function updateUserCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: userId } = common_schema_1.IdParam.parse(req.params);
        const body = users_schema_1.UpdateUserBody.parse(req.body);
        // Allow self-update or admin
        if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
            throw (0, errors_1.forbidden)('Can only update own profile');
        }
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, users_service_1.updateUser)(client, userId, req.user.organizationId, {
                fullName: body.fullName,
                email: body.email,
                isActive: body.isActive,
            });
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
 * POST /users/:id/password - Change password (self only)
 */
function changePasswordCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: userId } = common_schema_1.IdParam.parse(req.params);
        const { password } = req.body;
        // Only self
        if (req.user.userId !== userId) {
            throw (0, errors_1.forbidden)('Can only change own password');
        }
        if (!password || password.length < 8) {
            throw (0, errors_1.forbidden)('Password must be at least 8 characters');
        }
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            yield (0, users_service_1.changePassword)(client, userId, password);
            yield client.query('COMMIT');
            return reply.send({ ok: true });
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
