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
exports.getMetricsCtrl = getMetricsCtrl;
exports.getActivityCtrl = getActivityCtrl;
exports.getUserActivityCtrl = getUserActivityCtrl;
const dashboard_service_1 = require("../services/dashboard.service");
const dashboard_schema_1 = require("../schemas/dashboard.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
const helpers_1 = require("../db/helpers");
/**
 * GET /dashboard/metrics - Get dashboard metrics
 * Scoped by user role:
 * - ADMIN: sees all organization data
 * - EMPLOYEE: sees their assigned/raised tickets and projects
 * - CLIENT: sees their client's tickets and projects
 */
function getMetricsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const query = dashboard_schema_1.DashboardMetricsQuery.parse(req.query);
        const metrics = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, dashboard_service_1.getDashboardMetrics)(client, req.user.organizationId, req.user.role, req.user.userId, (_a = req.user.clientId) !== null && _a !== void 0 ? _a : null);
        }));
        return reply.send(metrics);
    });
}
/**
 * GET /dashboard/activity - Get recent activity
 * Scoped by user role:
 * - ADMIN: sees all organization activity
 * - EMPLOYEE: sees activity for their tickets
 * - CLIENT: sees activity for their client's tickets (PUBLIC comments only)
 */
function getActivityCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const query = dashboard_schema_1.RecentActivityQuery.parse(req.query);
        const activity = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return yield (0, dashboard_service_1.getRecentActivity)(client, req.user.organizationId, req.user.role, req.user.userId, (_a = req.user.clientId) !== null && _a !== void 0 ? _a : null, query.limit);
        }));
        return reply.send(activity);
    });
}
/**
 * GET /dashboard/users/:id/activity - Get user activity and performance metrics
 * ADMIN only - shows what a specific user is up to
 */
function getUserActivityCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        if (req.user.role !== 'ADMIN')
            throw (0, errors_1.forbidden)('Only admins can view user activity');
        const { id: userId } = common_schema_1.IdParam.parse(req.params);
        const metrics = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, dashboard_service_1.getUserActivityMetrics)(client, req.user.organizationId, userId);
        }));
        return reply.send(metrics);
    });
}
