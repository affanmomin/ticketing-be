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
exports.listPrioritiesCtrl = listPrioritiesCtrl;
exports.listStatusesCtrl = listStatusesCtrl;
const pool_1 = require("../db/pool");
const tags_service_1 = require("../services/tags.service");
const errors_1 = require("../utils/errors");
function listPrioritiesCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const client = yield pool_1.pool.connect();
        try {
            const result = yield (0, tags_service_1.listPriorities)(client);
            return reply.send(result);
        }
        finally {
            client.release();
        }
    });
}
function listStatusesCtrl(req, reply) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.user)
            throw (0, errors_1.unauthorized)('Authentication required');
        const client = yield pool_1.pool.connect();
        try {
            const result = yield (0, tags_service_1.listStatuses)(client);
            return reply.send(result);
        }
        finally {
            client.release();
        }
    });
}
