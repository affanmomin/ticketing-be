"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.signupCtrl = signupCtrl;
exports.loginCtrl = loginCtrl;
exports.meCtrl = meCtrl;
exports.logoutCtrl = logoutCtrl;
exports.forgotPasswordCtrl = forgotPasswordCtrl;
exports.resetPasswordCtrl = resetPasswordCtrl;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_schema_1 = require("../schemas/auth.schema");
const auth_service_1 = require("../services/auth.service");
const helpers_1 = require("../db/helpers");
const email_service_1 = require("../services/email.service");
function signupCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = auth_schema_1.AdminSignupBody.parse(req.body);
        const passwordHash = yield bcryptjs_1.default.hash(body.password, 10);
        const result = yield (0, helpers_1.withTransaction)((dbClient) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, auth_service_1.adminSignup)(dbClient, body.organizationName, body.fullName, body.email, passwordHash);
        }));
        const token = yield req.server.jwt.sign({
            sub: result.userId,
            organizationId: result.organizationId,
            role: result.role,
            clientId: result.clientId,
        });
        return reply.send({
            accessToken: token,
            user: {
                id: result.userId,
                organizationId: result.organizationId,
                role: result.role,
                clientId: result.clientId,
                email: result.email,
                fullName: result.fullName,
            },
        });
    });
}
function loginCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = auth_schema_1.LoginBody.parse(req.body);
        // Login is read-only (just verifying credentials), but we keep transaction for consistency
        // since it might update last_login or similar in the future
        const result = yield (0, helpers_1.withReadOnly)((dbClient) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, auth_service_1.login)(dbClient, body.email, body.password);
        }));
        const token = yield req.server.jwt.sign({
            sub: result.userId,
            organizationId: result.organizationId,
            role: result.role,
            clientId: result.clientId,
        });
        return reply.send({
            accessToken: token,
            user: {
                id: result.userId,
                organizationId: result.organizationId,
                role: result.role,
                clientId: result.clientId,
                email: result.email,
                fullName: result.fullName,
            },
        });
    });
}
function meCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw new Error('Auth required');
        // Read-only operation - no transaction needed
        const { getUserById } = yield Promise.resolve().then(() => __importStar(require('../services/auth.service')));
        const user = yield (0, helpers_1.withReadOnly)((dbClient) => __awaiter(this, void 0, void 0, function* () {
            return yield getUserById(dbClient, req.user.userId);
        }));
        return reply.send({
            id: user.userId,
            organizationId: user.organizationId,
            role: user.role,
            clientId: user.clientId,
            email: user.email,
            fullName: user.fullName,
        });
    });
}
function logoutCtrl(_req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        return reply.send({ ok: true });
    });
}
/**
 * POST /auth/forgot-password - Request password reset
 */
function forgotPasswordCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = auth_schema_1.ForgotPasswordBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((dbClient) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, auth_service_1.requestPasswordReset)(dbClient, body.email);
        }));
        // Only send email if user exists (result is not null)
        if (result) {
            yield email_service_1.emailService.sendPasswordResetEmail(result.email, result.fullName, result.token);
        }
        // Always return the same message to prevent email enumeration
        return reply.send({
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    });
}
/**
 * POST /auth/reset-password - Reset password with token
 */
function resetPasswordCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = auth_schema_1.ResetPasswordBody.parse(req.body);
        yield (0, helpers_1.withTransaction)((dbClient) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, auth_service_1.resetPassword)(dbClient, body.token, body.password);
        }));
        return reply.send({
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    });
}
