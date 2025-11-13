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
exports.withReadOnly = withReadOnly;
exports.withTransaction = withTransaction;
const pool_1 = require("./pool");
/**
 * Execute a read-only database operation (no transaction needed)
 * Read-only operations don't need transactions, which reduces overhead
 */
function withReadOnly(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool_1.pool.connect();
        try {
            return yield fn(client);
        }
        finally {
            client.release();
        }
    });
}
/**
 * Execute a write operation with transaction
 * Ensures atomicity for write operations
 */
function withTransaction(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield fn(client);
            yield client.query('COMMIT');
            return result;
        }
        catch (e) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            throw e;
        }
        finally {
            client.release();
        }
    });
}
