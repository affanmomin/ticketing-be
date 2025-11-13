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
exports.listPriorities = listPriorities;
exports.listStatuses = listStatuses;
function listPriorities(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, name, rank, color_hex, active, created_at, updated_at
     FROM priority
     WHERE active = true
     ORDER BY rank ASC`);
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            rank: r.rank,
            colorHex: r.color_hex,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    });
}
function listStatuses(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, name, is_closed, sequence, active, created_at, updated_at
     FROM status
     WHERE active = true
     ORDER BY sequence ASC`);
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            isClosed: r.is_closed,
            sequence: r.sequence,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    });
}
