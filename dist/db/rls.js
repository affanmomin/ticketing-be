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
exports.withRlsTx = withRlsTx;
exports.inArray = inArray;
exports.paginateSortClause = paginateSortClause;
exports.orgScope = orgScope;
exports.clientScope = clientScope;
function withRlsTx(req, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!req.user)
            throw new Error('Auth context required');
        const tx = (_a = req.db) === null || _a === void 0 ? void 0 : _a.tx;
        if (!tx)
            throw new Error('Transaction context required');
        return fn(tx);
    });
}
// SQL Query Builder helpers
function inArray(ids, cast = 'uuid') {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    return {
        text: `(${placeholders})${cast === 'uuid' ? '::uuid[]' : ''}`,
        values: ids,
    };
}
function paginateSortClause(input) {
    let clause = '';
    if (input.sortBy && input.whitelist.includes(input.sortBy)) {
        const dir = input.sortDir === 'DESC' ? 'DESC' : 'ASC';
        clause += ` ORDER BY ${input.sortBy} ${dir}`;
    }
    clause += ` LIMIT ${input.limit} OFFSET ${input.offset}`;
    return clause;
}
// Scope builders for auth context
function orgScope(orgId) {
    return {
        where: 'organization_id = $1',
        params: [orgId],
    };
}
function clientScope(clientId) {
    return {
        where: 'client_id = $1',
        params: [clientId],
    };
}
