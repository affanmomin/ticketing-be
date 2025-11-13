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
exports.default = outboxRoutes;
const outbox_controller_1 = require("../controllers/outbox.controller");
const outbox_schema_1 = require("../schemas/outbox.schema");
function outboxRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/_internal/outbox/pending', { schema: { querystring: outbox_schema_1.ListOutboxQuery } }, outbox_controller_1.listPendingOutboxCtrl);
        app.post('/_internal/outbox/process', { schema: { body: outbox_schema_1.ProcessOutboxBody } }, outbox_controller_1.processOutboxCtrl);
    });
}
