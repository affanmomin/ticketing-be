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
exports.default = streamsRoutes;
const streams_controller_1 = require("../controllers/streams.controller");
const streams_schema_1 = require("../schemas/streams.schema");
const common_schema_1 = require("../schemas/common.schema");
function streamsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/projects/:id/streams', { schema: { params: common_schema_1.IdParam, querystring: streams_schema_1.ListStreamsQuery } }, streams_controller_1.listStreamsCtrl);
        app.get('/projects/:id/streams/parents', { schema: { params: common_schema_1.IdParam } }, streams_controller_1.listParentStreamsCtrl);
        app.get('/streams/:id', { schema: { params: common_schema_1.IdParam } }, streams_controller_1.getStreamCtrl);
        app.get('/streams/:id/children', { schema: { params: common_schema_1.IdParam } }, streams_controller_1.listChildStreamsCtrl);
        app.post('/projects/:id/streams', { schema: { params: common_schema_1.IdParam, body: streams_schema_1.CreateStreamBody } }, streams_controller_1.createStreamCtrl);
        app.post('/streams/:id', { schema: { params: common_schema_1.IdParam, body: streams_schema_1.UpdateStreamBody } }, streams_controller_1.updateStreamCtrl);
    });
}
