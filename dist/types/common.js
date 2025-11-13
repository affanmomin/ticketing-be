"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClientUser = exports.isInternalUser = exports.canEditStatus = void 0;
const canEditStatus = (role) => role === 'ADMIN' || role === 'EMPLOYEE';
exports.canEditStatus = canEditStatus;
// Authorization helpers
const isInternalUser = (role) => role === 'ADMIN' || role === 'EMPLOYEE';
exports.isInternalUser = isInternalUser;
const isClientUser = (role) => role === 'CLIENT';
exports.isClientUser = isClientUser;
