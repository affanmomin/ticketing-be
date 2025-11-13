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
exports.default = ticketsRoutes;
const tickets_controller_1 = require("../controllers/tickets.controller");
const tickets_schema_1 = require("../schemas/tickets.schema");
const common_schema_1 = require("../schemas/common.schema");
function ticketsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/tickets', { schema: { querystring: tickets_schema_1.ListTicketsQuery } }, tickets_controller_1.listTicketsCtrl);
        app.get('/tickets/:id', { schema: { params: common_schema_1.IdParam } }, tickets_controller_1.getTicketCtrl);
        app.post('/tickets', { schema: { body: tickets_schema_1.CreateTicketBody } }, tickets_controller_1.createTicketCtrl);
        app.post('/tickets/:id', { schema: { params: common_schema_1.IdParam, body: tickets_schema_1.UpdateTicketBody } }, tickets_controller_1.updateTicketCtrl);
        app.delete('/tickets/:id', { schema: { params: common_schema_1.IdParam } }, tickets_controller_1.deleteTicketCtrl);
    });
}
