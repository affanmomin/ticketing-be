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
exports.listCommentsCtrl = listCommentsCtrl;
exports.getCommentCtrl = getCommentCtrl;
exports.createCommentCtrl = createCommentCtrl;
const comments_service_1 = require("../services/comments.service");
const comments_schema_1 = require("../schemas/comments.schema");
const common_schema_1 = require("../schemas/common.schema");
const errors_1 = require("../utils/errors");
const helpers_1 = require("../db/helpers");
/**
 * GET /tickets/:ticketId/comments
 * Read-only operation - no transaction needed
 */
function listCommentsCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = common_schema_1.IdParam.parse(req.params);
        const comments = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, comments_service_1.listComments)(client, ticketId, req.user.role);
        }));
        return reply.send(comments);
    });
}
/**
 * GET /comments/:id
 * Read-only operation - no transaction needed
 */
function getCommentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: commentId } = common_schema_1.IdParam.parse(req.params);
        const comment = yield (0, helpers_1.withReadOnly)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, comments_service_1.getComment)(client, commentId, req.user.role);
        }));
        return reply.send(comment);
    });
}
/**
 * POST /tickets/:ticketId/comments
 * Write operation - transaction required
 */
function createCommentCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const { id: ticketId } = common_schema_1.IdParam.parse(req.params);
        const body = comments_schema_1.CreateCommentBody.parse(req.body);
        // CLIENT users cannot create INTERNAL comments (enforced in service but quick check)
        if (req.user.role === 'CLIENT' && body.visibility === 'INTERNAL') {
            throw (0, errors_1.forbidden)('CLIENT users can only create PUBLIC comments');
        }
        const comment = yield (0, helpers_1.withTransaction)((client) => __awaiter(this, void 0, void 0, function* () {
            return yield (0, comments_service_1.createComment)(client, ticketId, req.user.userId, req.user.role, body.visibility, body.bodyMd);
        }));
        return reply.code(201).send(comment);
    });
}
