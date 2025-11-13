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
exports.default = subjectsRoutes;
const subjects_controller_1 = require("../controllers/subjects.controller");
const subjects_schema_1 = require("../schemas/subjects.schema");
const common_schema_1 = require("../schemas/common.schema");
function subjectsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/projects/:id/subjects', { schema: { params: common_schema_1.IdParam, querystring: subjects_schema_1.ListSubjectsQuery } }, subjects_controller_1.listSubjectsCtrl);
        app.get('/subjects/:id', { schema: { params: common_schema_1.IdParam } }, subjects_controller_1.getSubjectCtrl);
        app.post('/projects/:id/subjects', { schema: { params: common_schema_1.IdParam, body: subjects_schema_1.CreateSubjectBody } }, subjects_controller_1.createSubjectCtrl);
        app.post('/subjects/:id', { schema: { params: common_schema_1.IdParam, body: subjects_schema_1.UpdateSubjectBody } }, subjects_controller_1.updateSubjectCtrl);
    });
}
