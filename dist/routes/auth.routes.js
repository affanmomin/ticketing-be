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
exports.default = authRoutes;
const auth_controller_1 = require("../controllers/auth.controller");
const auth_schema_1 = require("../schemas/auth.schema");
function authRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.post('/auth/signup', { schema: { body: auth_schema_1.AdminSignupBody } }, auth_controller_1.signupCtrl); // public
        app.post('/auth/login', { schema: { body: auth_schema_1.LoginBody } }, auth_controller_1.loginCtrl); // public
        app.post('/auth/forgot-password', { schema: { body: auth_schema_1.ForgotPasswordBody } }, auth_controller_1.forgotPasswordCtrl); // public
        app.post('/auth/reset-password', { schema: { body: auth_schema_1.ResetPasswordBody } }, auth_controller_1.resetPasswordCtrl); // public
        app.get('/auth/me', auth_controller_1.meCtrl); // protected
        app.post('/auth/logout', auth_controller_1.logoutCtrl); // protected
    });
}
