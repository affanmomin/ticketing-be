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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.createEmployee = createEmployee;
exports.createClientUser = createClientUser;
exports.updateUser = updateUser;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errors_1 = require("../utils/errors");
/**
 * List users within an organization (ADMIN/EMPLOYEE only)
 * For ADMIN: lists all internal users (ADMIN + EMPLOYEE) and CLIENT users
 * For EMPLOYEE: lists other EMPLOYEEs and CLIENTs in same org
 */
function listUsers(tx, organizationId, filter, limit, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        const conditions = ['au.organization_id = $1'];
        const params = [organizationId];
        let paramIndex = 2;
        if (filter.userType) {
            conditions.push(`au.user_type = $${paramIndex}`);
            params.push(filter.userType);
            paramIndex++;
        }
        if (filter.isActive !== undefined) {
            conditions.push(`au.is_active = $${paramIndex}`);
            params.push(filter.isActive);
            paramIndex++;
        }
        if (filter.search) {
            conditions.push(`(LOWER(au.full_name) LIKE $${paramIndex} OR LOWER(au.email) LIKE $${paramIndex})`);
            params.push(`%${filter.search.toLowerCase()}%`);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        // Get total count
        const { rows: countRows } = yield tx.query(`SELECT COUNT(*)::int as total FROM app_user au WHERE ${whereClause}`, params);
        const total = countRows[0].total;
        // Get paginated results
        params.push(limit, offset);
        const { rows } = yield tx.query(`SELECT
      au.id, au.organization_id, au.client_id, au.user_type, au.email, au.full_name,
      au.is_active, au.created_at, au.updated_at
     FROM app_user au
     WHERE ${whereClause}
     ORDER BY au.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
        return {
            data: rows.map(r => ({
                id: r.id,
                organizationId: r.organization_id,
                clientId: r.client_id,
                userType: r.user_type,
                email: r.email,
                fullName: r.full_name,
                isActive: r.is_active,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
            total,
        };
    });
}
/**
 * Get single user by ID
 */
function getUserById(tx, userId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, organization_id, client_id, user_type, email, full_name,
            is_active, created_at, updated_at
     FROM app_user WHERE id = $1 AND organization_id = $2`, [userId, organizationId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('User not found');
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            clientId: r.client_id,
            userType: r.user_type,
            email: r.email,
            fullName: r.full_name,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Create EMPLOYEE user (ADMIN only)
 */
function createEmployee(tx, organizationId, email, fullName, password) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check email uniqueness
        const { rows: existing } = yield tx.query('SELECT id FROM app_user WHERE email = $1', [email]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Email already in use');
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const { rows } = yield tx.query(`INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, NULL, 'EMPLOYEE', $2, $3, $4, true)
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`, [organizationId, email, fullName, passwordHash]);
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            clientId: r.client_id,
            userType: r.user_type,
            email: r.email,
            fullName: r.full_name,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Create CLIENT user (ADMIN only, requires valid client)
 */
function createClientUser(tx, organizationId, clientId, email, fullName, password) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verify client belongs to organization
        const { rows: clientRows } = yield tx.query('SELECT id FROM client WHERE id = $1 AND organization_id = $2', [clientId, organizationId]);
        if (clientRows.length === 0)
            throw (0, errors_1.forbidden)('Client does not belong to organization');
        // Check email uniqueness
        const { rows: existing } = yield tx.query('SELECT id FROM app_user WHERE email = $1', [email]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Email already in use');
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const { rows } = yield tx.query(`INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, $2, 'CLIENT', $3, $4, $5, true)
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`, [organizationId, clientId, email, fullName, passwordHash]);
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            clientId: r.client_id,
            userType: r.user_type,
            email: r.email,
            fullName: r.full_name,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Update user (name, email, active status)
 * Cannot change role via this function
 */
function updateUser(tx, userId, organizationId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: existing } = yield tx.query('SELECT id FROM app_user WHERE id = $1 AND organization_id = $2', [userId, organizationId]);
        if (existing.length === 0)
            throw (0, errors_1.notFound)('User not found');
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        if (updates.fullName !== undefined) {
            updateFields.push(`full_name = $${paramIndex}`);
            params.push(updates.fullName);
            paramIndex++;
        }
        if (updates.email !== undefined) {
            // Check email uniqueness (excluding current user)
            const { rows: emailCheck } = yield tx.query('SELECT id FROM app_user WHERE email = $1 AND id != $2', [updates.email, userId]);
            if (emailCheck.length > 0)
                throw (0, errors_1.badRequest)('Email already in use');
            updateFields.push(`email = $${paramIndex}`);
            params.push(updates.email);
            paramIndex++;
        }
        if (updates.isActive !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            params.push(updates.isActive);
            paramIndex++;
        }
        if (updateFields.length === 0)
            throw (0, errors_1.badRequest)('No fields to update');
        params.push(userId);
        const { rows } = yield tx.query(`UPDATE app_user SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, organization_id, client_id, user_type, email, full_name, is_active, created_at, updated_at`, params);
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            clientId: r.client_id,
            userType: r.user_type,
            email: r.email,
            fullName: r.full_name,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Change password (user calls this for themselves)
 */
function changePassword(tx, userId, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const passwordHash = yield bcryptjs_1.default.hash(newPassword, 10);
        const { rows } = yield tx.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('User not found');
    });
}
