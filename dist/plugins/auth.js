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
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const errors_1 = require("../utils/errors");
exports.default = (0, fastify_plugin_1.default)((app) => __awaiter(void 0, void 0, void 0, function* () {
    yield app.register(jwt_1.default, {
        secret: process.env.JWT_SECRET || 'dev-secret',
        sign: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
    });
    app.addHook('onRequest', (req, _res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Allow unauthenticated routes
        const path = (req.url || '').split('?')[0];
        const unauthenticatedPaths = [
            '/health',
            '/auth/login',
            '/auth/signup',
            '/auth/client-signup',
            '/auth/invite',
            '/auth/forgot-password',
            '/auth/reset-password',
            '/',
        ];
        if (unauthenticatedPaths.some(p => path === p) || path.startsWith('/docs'))
            return;
        const auth = req.headers.authorization;
        if (!(auth === null || auth === void 0 ? void 0 : auth.startsWith('Bearer ')))
            throw (0, errors_1.unauthorized)('Missing or invalid Authorization header');
        const token = auth.split(' ')[1];
        let decoded;
        try {
            decoded = app.jwt.decode(token);
        }
        catch (_b) {
            throw (0, errors_1.unauthorized)('Invalid token');
        }
        if (!(decoded === null || decoded === void 0 ? void 0 : decoded.sub) || !(decoded === null || decoded === void 0 ? void 0 : decoded.organizationId) || !(decoded === null || decoded === void 0 ? void 0 : decoded.role))
            throw (0, errors_1.unauthorized)('Invalid token');
        req.user = {
            userId: decoded.sub,
            organizationId: decoded.organizationId,
            role: decoded.role,
            clientId: (_a = decoded.clientId) !== null && _a !== void 0 ? _a : null,
        };
    }));
}));
