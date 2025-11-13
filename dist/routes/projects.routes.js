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
exports.default = projectsRoutes;
const projects_controller_1 = require("../controllers/projects.controller");
const projects_schema_1 = require("../schemas/projects.schema");
const common_schema_1 = require("../schemas/common.schema");
function projectsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/projects', { schema: { querystring: projects_schema_1.ListProjectsQuery } }, projects_controller_1.listProjectsCtrl);
        app.get('/projects/:id', { schema: { params: common_schema_1.IdParam } }, projects_controller_1.getProjectCtrl);
        app.post('/projects', { schema: { body: projects_schema_1.CreateProjectBody } }, projects_controller_1.createProjectCtrl);
        app.post('/projects/:id', { schema: { params: common_schema_1.IdParam, body: projects_schema_1.UpdateProjectBody } }, projects_controller_1.updateProjectCtrl);
        app.get('/projects/:id/taxonomy', { schema: { params: common_schema_1.IdParam } }, projects_controller_1.getProjectTaxonomyCtrl);
        app.get('/projects/:id/members', { schema: { params: common_schema_1.IdParam } }, projects_controller_1.getProjectMembersCtrl);
        app.post('/projects/:id/members', { schema: { params: common_schema_1.IdParam, body: projects_schema_1.AddProjectMemberBody } }, projects_controller_1.addProjectMemberCtrl);
        app.post('/projects/:projectId/members/:userId', { schema: { params: projects_schema_1.ProjectMemberParams, body: projects_schema_1.UpdateProjectMemberBody } }, projects_controller_1.updateProjectMemberCtrl);
        app.delete('/projects/:projectId/members/:userId', { schema: { params: projects_schema_1.ProjectMemberParams } }, projects_controller_1.removeProjectMemberCtrl);
    });
}
