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
/// <reference path="./types/fastify.d.ts" />
const fastify_1 = __importDefault(require("fastify"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const security_1 = __importDefault(require("./plugins/security"));
const auth_1 = __importDefault(require("./plugins/auth"));
const multipart_1 = __importDefault(require("./plugins/multipart"));
const swagger_1 = __importDefault(require("./plugins/swagger"));
const routes_1 = __importDefault(require("./routes"));
const server = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
}).withTypeProvider();
server.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
server.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
server.get('/', (_req, reply) => __awaiter(void 0, void 0, void 0, function* () { return reply.status(200).send('API is live'); }));
server.get('/health', () => __awaiter(void 0, void 0, void 0, function* () { return ({ ok: true }); }));
server.register(security_1.default);
server.register(multipart_1.default);
server.register(auth_1.default);
server.register(swagger_1.default);
server.register(routes_1.default);
server.setErrorHandler((err, _req, reply) => {
    var _a, _b, _c;
    const status = (_a = err.statusCode) !== null && _a !== void 0 ? _a : 500;
    const code = (_b = err.code) !== null && _b !== void 0 ? _b : 'INTERNAL';
    reply.status(status).send({ code, message: (_c = err.message) !== null && _c !== void 0 ? _c : 'Server error' });
});
exports.default = server;
