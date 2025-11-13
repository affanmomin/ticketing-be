"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLimitOffset = parseLimitOffset;
function parseLimitOffset(q) {
    var _a, _b;
    let l = Number((_a = q === null || q === void 0 ? void 0 : q.limit) !== null && _a !== void 0 ? _a : 50);
    if (!Number.isFinite(l) || l < 1)
        l = 50;
    if (l > 200)
        l = 200;
    let o = Number((_b = q === null || q === void 0 ? void 0 : q.offset) !== null && _b !== void 0 ? _b : 0);
    if (!Number.isFinite(o) || o < 0)
        o = 0;
    return { limit: l, offset: o };
}
