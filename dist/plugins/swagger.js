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
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const node_path_1 = __importDefault(require("node:path"));
exports.default = (0, fastify_plugin_1.default)((app) => __awaiter(void 0, void 0, void 0, function* () {
    yield app.register(swagger_1.default, {
        mode: 'static',
        specification: {
            path: node_path_1.default.join(process.cwd(), 'openapi.yaml'),
            baseDir: process.cwd(),
        },
        exposeRoute: true,
        openapi: {
            info: { title: 'Code Companion Ticketing API', version: '1.0.0' },
        },
    });
    yield app.register(swagger_ui_1.default, {
        routePrefix: '/docs',
        staticCSP: true,
    });
}));
