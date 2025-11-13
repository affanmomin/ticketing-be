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
exports.listProjectsCtrl = listProjectsCtrl;
exports.getProjectCtrl = getProjectCtrl;
exports.createProjectCtrl = createProjectCtrl;
exports.updateProjectCtrl = updateProjectCtrl;
exports.getProjectMembersCtrl = getProjectMembersCtrl;
exports.addProjectMemberCtrl = addProjectMemberCtrl;
exports.updateProjectMemberCtrl = updateProjectMemberCtrl;
exports.removeProjectMemberCtrl = removeProjectMemberCtrl;
exports.getProjectTaxonomyCtrl = getProjectTaxonomyCtrl;
const helpers_1 = require("../db/helpers");
const projects_service_1 = require("../services/projects.service");
const projects_schema_1 = require("../schemas/projects.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
/**
 * GET /projects - List projects with role-based scoping
 * Read-only operation - no transaction needed
 */
function listProjectsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const query = projects_schema_1.ListProjectsQuery.parse(req.query);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, projects_service_1.listProjects)(client, {
                organizationId: req.user.organizationId,
                userId: req.user.userId,
                role: req.user.role,
                clientId: (_a = req.user.clientId) !== null && _a !== void 0 ? _a : null,
                filters: { clientId: query.clientId },
                pagination: { limit: query.limit, offset: query.offset },
            });
        }));
        return reply.send(result);
    });
}
/**
 * GET /projects/:id - Get single project (scoped by role)
 * Read-only operation - no transaction needed
 */
function getProjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const project = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, projects_service_1.getProject)(client, projectId, req.user.organizationId);
        }));
        // // Additional client scope check
        // if (req.user.role === 'CLIENT' && project.clientId !== req.user.clientId) {
        //   throw forbidden('Cannot access projects for other clients');
        // }
        return reply.send(project);
    });
}
/**
 * POST /projects - Create project (ADMIN only)
 * Write operation - transaction required
 */
function createProjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can create projects');
        const body = projects_schema_1.CreateProjectBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            return yield (0, projects_service_1.createProject)(client, req.user.organizationId, body.clientId, body.name, (_a = body.description) !== null && _a !== void 0 ? _a : null, (_b = body.startDate) !== null && _b !== void 0 ? _b : null, (_c = body.endDate) !== null && _c !== void 0 ? _c : null);
        }));
        return reply.code(201).send(result);
    });
}
/**
 * PATCH /projects/:id - Update project (ADMIN only)
 * Write operation - transaction required
 */
function updateProjectCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can update projects');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const body = projects_schema_1.UpdateProjectBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            return yield (0, projects_service_1.updateProject)(client, projectId, req.user.organizationId, {
                name: body.name,
                description: (_a = body.description) !== null && _a !== void 0 ? _a : null,
                startDate: (_b = body.startDate) !== null && _b !== void 0 ? _b : null,
                endDate: (_c = body.endDate) !== null && _c !== void 0 ? _c : null,
                active: body.active,
            });
        }));
        return reply.send(result);
    });
}
/**
 * GET /projects/:projectId/members - List project members (ADMIN only)
 * Read-only operation - no transaction needed
 */
function getProjectMembersCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        // if (req.user.role !== 'ADMIN') throw forbidden('Only admins can view project members');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, projects_service_1.getProjectMembers)(client, projectId, req.user.organizationId);
        }));
        return reply.send(result);
    });
}
/**
 * POST /projects/:projectId/members - Add project member (ADMIN only)
 * Write operation - transaction required
 */
function addProjectMemberCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can manage project members');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const body = projects_schema_1.AddProjectMemberBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, projects_service_1.addProjectMember)(client, projectId, body.userId, req.user.organizationId, body.role, body.canRaise, body.canBeAssigned);
        }));
        return reply.code(201).send(result);
    });
}
/**
 * PATCH /projects/:projectId/members/:userId - Update project member (ADMIN only)
 * Write operation - transaction required
 */
function updateProjectMemberCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can manage project members');
        const { projectId, userId } = projects_schema_1.ProjectMemberParams.parse(req.params);
        const body = projects_schema_1.UpdateProjectMemberBody.parse(req.body);
        const result = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, projects_service_1.updateProjectMember)(client, projectId, userId, req.user.organizationId, {
                role: body.role,
                canRaise: body.canRaise,
                canBeAssigned: body.canBeAssigned,
            });
        }));
        return reply.send(result);
    });
}
/**
 * DELETE /projects/:projectId/members/:userId - Remove project member (ADMIN only)
 * Write operation - transaction required
 */
function removeProjectMemberCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can manage project members');
        const { projectId, userId } = projects_schema_1.ProjectMemberParams.parse(req.params);
        yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            yield (0, projects_service_1.removeProjectMember)(client, projectId, userId, req.user.organizationId);
        }));
        return reply.status(204).send();
    });
}
/**
 * GET /projects/:id/taxonomy - Get project streams and subjects summary
 * Read-only operation - no transaction needed
 */
function getProjectTaxonomyCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: projectId } = common_schema_1.IdParam.parse(req.params);
        const result = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, projects_service_1.getProjectTaxonomy)(client, projectId, req.user.organizationId);
        }));
        return reply.send(result);
    });
}
