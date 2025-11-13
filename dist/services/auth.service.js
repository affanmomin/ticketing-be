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
exports.adminSignup = adminSignup;
exports.login = login;
exports.createUser = createUser;
exports.getUserById = getUserById;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const errors_1 = require("../utils/errors");
/**
 * Admin signup: creates organization + admin user
 */
function adminSignup(tx, organizationName, fullName, email, passwordHash) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check email uniqueness
        const { rows: existing } = yield tx.query('SELECT id FROM app_user WHERE email = $1', [email]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Email already in use');
        // Create organization
        const { rows: orgRows } = yield tx.query('INSERT INTO organization (name) VALUES ($1) RETURNING id', [organizationName]);
        const orgId = orgRows[0].id;
        // Create admin user
        const { rows: userRows } = yield tx.query(`INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`, [orgId, 'ADMIN', email, fullName, passwordHash]);
        const userId = userRows[0].id;
        return {
            userId,
            organizationId: orgId,
            role: 'ADMIN',
            clientId: null,
            email,
            fullName,
        };
    });
}
/**
 * Login: verify credentials and return JWT payload
 */
function login(tx, email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: users } = yield tx.query('SELECT id, organization_id, user_type, full_name, email, password_hash, client_id FROM app_user WHERE email = $1 AND is_active = true', [email]);
        if (users.length === 0)
            throw (0, errors_1.unauthorized)('Invalid credentials');
        const user = users[0];
        // Verify password
        const passwordMatch = yield bcryptjs_1.default.compare(password, user.password_hash);
        if (!passwordMatch)
            throw (0, errors_1.unauthorized)('Invalid credentials');
        // For CLIENT users, use their client_id from the user record
        // For internal users (ADMIN/EMPLOYEE), client_id should be null
        let clientId = user.client_id || null;
        if (user.user_type === 'CLIENT' && !clientId) {
            throw (0, errors_1.badRequest)('Client user has no associated client');
        }
        if ((user.user_type === 'ADMIN' || user.user_type === 'EMPLOYEE') && clientId) {
            throw (0, errors_1.badRequest)('Internal user should not have a client_id');
        }
        return {
            userId: user.id,
            organizationId: user.organization_id,
            role: user.user_type,
            clientId,
            email: user.email,
            fullName: user.full_name,
        };
    });
}
/**
 * Create a user (ADMIN creates EMPLOYEE or CLIENT)
 */
function createUser(tx, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate role/client_id semantics
        if (payload.userType === 'ADMIN' || payload.userType === 'EMPLOYEE') {
            if (payload.clientId !== null && payload.clientId !== undefined) {
                throw (0, errors_1.badRequest)(`${payload.userType} users must have client_id = NULL`);
            }
            payload.clientId = null;
        }
        else if (payload.userType === 'CLIENT') {
            if (!payload.clientId)
                throw (0, errors_1.badRequest)('CLIENT user must have a valid client_id');
            // Verify client belongs to same org
            const { rows: clientRows } = yield tx.query('SELECT id FROM client WHERE id = $1 AND organization_id = $2', [payload.clientId, payload.organizationId]);
            if (clientRows.length === 0)
                throw (0, errors_1.forbidden)('Client does not belong to organization');
        }
        // Check email uniqueness
        const { rows: existing } = yield tx.query('SELECT id FROM app_user WHERE email = $1', [payload.email]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Email already in use');
        // Insert user
        const { rows: userRows } = yield tx.query(`INSERT INTO app_user (organization_id, client_id, user_type, email, full_name, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`, [payload.organizationId, payload.clientId || null, payload.userType, payload.email, payload.fullName, payload.passwordHash]);
        const userId = userRows[0].id;
        return {
            userId,
            organizationId: payload.organizationId,
            role: payload.userType,
            clientId: payload.clientId || null,
            email: payload.email,
            fullName: payload.fullName,
        };
    });
}
/**
 * Get user by ID with organization and client info
 */
function getUserById(tx, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: users } = yield tx.query(`SELECT id, organization_id, user_type, email, full_name, client_id
     FROM app_user WHERE id = $1`, [userId]);
        if (users.length === 0)
            throw (0, errors_1.unauthorized)('User not found');
        const user = users[0];
        return {
            userId: user.id,
            organizationId: user.organization_id,
            role: user.user_type,
            clientId: user.client_id || null,
            email: user.email,
            fullName: user.full_name,
        };
    });
}
/**
 * Request password reset: create token and return user info
 */
function requestPasswordReset(tx, email) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find user by email
        const { rows: users } = yield tx.query('SELECT id, email, full_name FROM app_user WHERE email = $1 AND is_active = true', [email]);
        // If user doesn't exist, return null (controller will handle the response)
        // This prevents email enumeration attacks
        if (users.length === 0) {
            return null;
        }
        const user = users[0];
        // Generate secure random token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        // Token expires in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        // Invalidate any existing unused tokens for this user
        yield tx.query('UPDATE password_reset_token SET used = true WHERE user_id = $1 AND used = false', [user.id]);
        // Create new reset token
        yield tx.query('INSERT INTO password_reset_token (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);
        return {
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            token,
        };
    });
}
/**
 * Reset password: validate token and update password
 */
function resetPassword(tx, token, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find valid token
        const { rows: tokenRows } = yield tx.query(`SELECT prt.id, prt.user_id, prt.expires_at, prt.used
     FROM password_reset_token prt
     WHERE prt.token = $1`, [token]);
        if (tokenRows.length === 0) {
            throw (0, errors_1.badRequest)('Invalid or expired reset token');
        }
        const tokenData = tokenRows[0];
        // Check if token is already used
        if (tokenData.used) {
            throw (0, errors_1.badRequest)('This reset token has already been used');
        }
        // Check if token is expired
        const now = new Date();
        if (new Date(tokenData.expires_at) < now) {
            throw (0, errors_1.badRequest)('This reset token has expired');
        }
        // Hash new password
        const passwordHash = yield bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        yield tx.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [
            passwordHash,
            tokenData.user_id,
        ]);
        // Mark token as used
        yield tx.query('UPDATE password_reset_token SET used = true WHERE id = $1', [tokenData.id]);
    });
}
