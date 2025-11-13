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
exports.listClients = listClients;
exports.getClient = getClient;
exports.createClient = createClient;
exports.updateClient = updateClient;
const errors_1 = require("../utils/errors");
/**
 * List all clients in an organization
 */
function listClients(tx, organizationId, limit, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get total count
        const { rows: countRows } = yield tx.query('SELECT COUNT(*)::int as total FROM client WHERE organization_id = $1', [organizationId]);
        const total = countRows[0].total;
        // Get paginated results
        const { rows } = yield tx.query(`SELECT id, organization_id, name, email, phone, address, active, created_at, updated_at
     FROM client WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [organizationId, limit, offset]);
        return {
            data: rows.map(r => ({
                id: r.id,
                organizationId: r.organization_id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                address: r.address,
                active: r.active,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
            total,
        };
    });
}
/**
 * Get single client by ID (scoped to organization)
 */
function getClient(tx, clientId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT id, organization_id, name, email, phone, address, active, created_at, updated_at
     FROM client WHERE id = $1 AND organization_id = $2`, [clientId, organizationId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Client not found');
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Create a new client
 */
function createClient(tx, organizationId, name, email, phone, address) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check unique constraint (organization_id, name)
        const { rows: existing } = yield tx.query('SELECT id FROM client WHERE organization_id = $1 AND name = $2', [organizationId, name]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Client with this name already exists in organization');
        const { rows } = yield tx.query(`INSERT INTO client (organization_id, name, email, phone, address, active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, organization_id, name, email, phone, address, active, created_at, updated_at`, [organizationId, name, email || null, phone || null, address || null]);
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Update a client
 */
function updateClient(tx, clientId, organizationId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verify client exists in organization
        const { rows: existing } = yield tx.query('SELECT id FROM client WHERE id = $1 AND organization_id = $2', [clientId, organizationId]);
        if (existing.length === 0)
            throw (0, errors_1.notFound)('Client not found');
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        if (updates.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            params.push(updates.name);
            paramIndex++;
        }
        if (updates.email !== undefined) {
            updateFields.push(`email = $${paramIndex}`);
            params.push(updates.email);
            paramIndex++;
        }
        if (updates.phone !== undefined) {
            updateFields.push(`phone = $${paramIndex}`);
            params.push(updates.phone);
            paramIndex++;
        }
        if (updates.address !== undefined) {
            updateFields.push(`address = $${paramIndex}`);
            params.push(updates.address);
            paramIndex++;
        }
        if (updates.active !== undefined) {
            updateFields.push(`active = $${paramIndex}`);
            params.push(updates.active);
            paramIndex++;
        }
        if (updateFields.length === 0)
            throw (0, errors_1.badRequest)('No fields to update');
        params.push(clientId);
        const { rows } = yield tx.query(`UPDATE client SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, organization_id, name, email, phone, address, active, created_at, updated_at`, params);
        const r = rows[0];
        return {
            id: r.id,
            organizationId: r.organization_id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
