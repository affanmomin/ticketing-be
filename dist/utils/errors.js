"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.forbidden = exports.unauthorized = exports.badRequest = exports.httpError = void 0;
const httpError = (status, code, message) => {
    const e = new Error(message);
    e.statusCode = status;
    e.code = code;
    return e;
};
exports.httpError = httpError;
const badRequest = (m) => (0, exports.httpError)(400, 'BAD_REQUEST', m);
exports.badRequest = badRequest;
const unauthorized = (m) => (0, exports.httpError)(401, 'UNAUTHORIZED', m);
exports.unauthorized = unauthorized;
const forbidden = (m) => (0, exports.httpError)(403, 'FORBIDDEN', m);
exports.forbidden = forbidden;
const notFound = (m) => (0, exports.httpError)(404, 'NOT_FOUND', m);
exports.notFound = notFound;
