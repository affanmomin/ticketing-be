"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListClientsQuery = exports.UpdateClientBody = exports.CreateClientBody = void 0;
const zod_1 = require("zod");
exports.CreateClientBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(50).optional(),
    address: zod_1.z.string().max(500).optional(),
});
exports.UpdateClientBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(50).optional(),
    address: zod_1.z.string().max(500).optional(),
    active: zod_1.z.boolean().optional(),
});
exports.ListClientsQuery = zod_1.z.object({
    search: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
