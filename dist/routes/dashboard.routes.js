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
exports.default = dashboardRoutes;
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const dashboard_schema_1 = require("../schemas/dashboard.schema");
const common_schema_1 = require("../schemas/common.schema");
function dashboardRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/dashboard/metrics', { schema: { querystring: dashboard_schema_1.DashboardMetricsQuery } }, dashboard_controller_1.getMetricsCtrl);
        app.get('/dashboard/activity', { schema: { querystring: dashboard_schema_1.RecentActivityQuery } }, dashboard_controller_1.getActivityCtrl);
        app.get('/dashboard/users/:id/activity', { schema: { params: common_schema_1.IdParam } }, dashboard_controller_1.getUserActivityCtrl);
    });
}
