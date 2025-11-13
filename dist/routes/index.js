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
exports.default = registerRoutes;
const auth_routes_1 = __importDefault(require("./auth.routes"));
const tenants_routes_1 = __importDefault(require("./tenants.routes"));
const users_routes_1 = __importDefault(require("./users.routes"));
const clients_routes_1 = __importDefault(require("./clients.routes"));
const projects_routes_1 = __importDefault(require("./projects.routes"));
const streams_routes_1 = __importDefault(require("./streams.routes"));
const subjects_routes_1 = __importDefault(require("./subjects.routes"));
const tickets_routes_1 = __importDefault(require("./tickets.routes"));
const comments_routes_1 = __importDefault(require("./comments.routes"));
const tags_routes_1 = __importDefault(require("./tags.routes"));
const attachments_routes_1 = __importDefault(require("./attachments.routes"));
const outbox_routes_1 = __importDefault(require("./outbox.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        yield app.register(auth_routes_1.default);
        yield app.register(tenants_routes_1.default);
        yield app.register(users_routes_1.default);
        yield app.register(clients_routes_1.default);
        yield app.register(projects_routes_1.default);
        yield app.register(streams_routes_1.default);
        yield app.register(subjects_routes_1.default);
        yield app.register(tickets_routes_1.default);
        yield app.register(comments_routes_1.default);
        yield app.register(tags_routes_1.default);
        yield app.register(attachments_routes_1.default);
        yield app.register(outbox_routes_1.default);
        yield app.register(dashboard_routes_1.default);
    });
}
