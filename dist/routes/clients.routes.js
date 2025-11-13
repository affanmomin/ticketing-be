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
exports.default = clientsRoutes;
const clients_controller_1 = require("../controllers/clients.controller");
const clients_schema_1 = require("../schemas/clients.schema");
const common_schema_1 = require("../schemas/common.schema");
function clientsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/clients', { schema: { querystring: clients_schema_1.ListClientsQuery } }, clients_controller_1.listClientsCtrl);
        app.get('/clients/:id', { schema: { params: common_schema_1.IdParam } }, clients_controller_1.getClientCtrl);
        app.post('/clients', { schema: { body: clients_schema_1.CreateClientBody } }, clients_controller_1.createClientCtrl);
        app.post('/clients/:id', { schema: { params: common_schema_1.IdParam, body: clients_schema_1.UpdateClientBody } }, clients_controller_1.updateClientCtrl);
    });
}
