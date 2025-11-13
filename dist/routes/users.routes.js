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
exports.default = usersRoutes;
const users_controller_1 = require("../controllers/users.controller");
const users_schema_1 = require("../schemas/users.schema");
const common_schema_1 = require("../schemas/common.schema");
function usersRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        // List users (ADMIN/EMPLOYEE)
        app.get('/users', { schema: { querystring: users_schema_1.ListUsersQuery } }, users_controller_1.listUsersCtrl);
        // Get single user
        app.get('/users/:id', { schema: { params: common_schema_1.IdParam } }, users_controller_1.getUserCtrl);
        // Create employee (ADMIN only)
        app.post('/employees', users_controller_1.createEmployeeCtrl);
        // Create client user (ADMIN only)
        app.post('/client-users', users_controller_1.createClientUserCtrl);
        // Update user
        app.post('/users/:id', { schema: { params: common_schema_1.IdParam } }, users_controller_1.updateUserCtrl);
        // Change password (self)
        app.post('/users/:id/password', { schema: { params: common_schema_1.IdParam } }, users_controller_1.changePasswordCtrl);
    });
}
