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
exports.listStreams = listStreams;
exports.getStream = getStream;
exports.createStream = createStream;
exports.updateStream = updateStream;
exports.listParentStreams = listParentStreams;
exports.listChildStreams = listChildStreams;
const errors_1 = require("../utils/errors");
function listStreams(tx, projectId, organizationId, limit, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: projectRows } = yield tx.query(`SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`, [projectId, organizationId]);
        if (projectRows.length === 0)
            throw (0, errors_1.forbidden)('Project not found');
        const { rows: countRows } = yield tx.query('SELECT COUNT(*)::int as total FROM stream WHERE project_id = $1 AND active = true', [projectId]);
        const total = countRows[0].total;
        const { rows } = yield tx.query(`SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream WHERE project_id = $1 AND active = true
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [projectId, limit, offset]);
        return {
            data: rows.map(r => ({
                id: r.id,
                projectId: r.project_id,
                parentStreamId: r.parent_stream_id,
                name: r.name,
                description: r.description,
                active: r.active,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
            total,
        };
    });
}
function getStream(tx, streamId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT s.id, s.project_id, s.parent_stream_id, s.name, s.description, s.active, s.created_at, s.updated_at
     FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`, [streamId, organizationId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Stream not found');
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            parentStreamId: r.parent_stream_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
function createStream(tx, organizationId, projectId, name, description, parentStreamId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: projectRows } = yield tx.query(`SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`, [projectId, organizationId]);
        if (projectRows.length === 0)
            throw (0, errors_1.forbidden)('Project not found');
        // If parent_stream_id provided, verify it exists and belongs to same project
        if (parentStreamId) {
            const { rows: parentRows } = yield tx.query('SELECT id FROM stream WHERE id = $1 AND project_id = $2', [parentStreamId, projectId]);
            if (parentRows.length === 0)
                throw (0, errors_1.badRequest)('Parent stream not found or does not belong to this project');
        }
        const { rows: existing } = yield tx.query('SELECT id FROM stream WHERE project_id = $1 AND name = $2', [projectId, name]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Stream with this name already exists');
        const { rows } = yield tx.query(`INSERT INTO stream (project_id, parent_stream_id, name, description, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, project_id, parent_stream_id, name, description, active, created_at, updated_at`, [projectId, parentStreamId || null, name, description || null]);
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            parentStreamId: r.parent_stream_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
function updateStream(tx, streamId, organizationId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: existing } = yield tx.query(`SELECT s.id, s.project_id FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`, [streamId, organizationId]);
        if (existing.length === 0)
            throw (0, errors_1.notFound)('Stream not found');
        const projectId = existing[0].project_id;
        // If parent_stream_id is being updated, verify it exists and prevent circular reference
        if (updates.parentStreamId !== undefined && updates.parentStreamId !== null) {
            if (updates.parentStreamId === streamId) {
                throw (0, errors_1.badRequest)('A stream cannot be its own parent');
            }
            const { rows: parentRows } = yield tx.query('SELECT id FROM stream WHERE id = $1 AND project_id = $2', [updates.parentStreamId, projectId]);
            if (parentRows.length === 0)
                throw (0, errors_1.badRequest)('Parent stream not found or does not belong to this project');
        }
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        if (updates.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            params.push(updates.name);
            paramIndex++;
        }
        if (updates.description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            params.push(updates.description);
            paramIndex++;
        }
        if (updates.active !== undefined) {
            updateFields.push(`active = $${paramIndex}`);
            params.push(updates.active);
            paramIndex++;
        }
        if (updates.parentStreamId !== undefined) {
            updateFields.push(`parent_stream_id = $${paramIndex}`);
            params.push(updates.parentStreamId);
            paramIndex++;
        }
        if (updateFields.length === 0)
            throw (0, errors_1.badRequest)('No fields to update');
        params.push(streamId);
        const { rows } = yield tx.query(`UPDATE stream SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, parent_stream_id, name, description, active, created_at, updated_at`, params);
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            parentStreamId: r.parent_stream_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
/**
 * Get all parent streams (streams with no parent) for a project
 * This is for populating the first dropdown
 */
function listParentStreams(tx, projectId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: projectRows } = yield tx.query(`SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`, [projectId, organizationId]);
        if (projectRows.length === 0)
            throw (0, errors_1.forbidden)('Project not found');
        const { rows } = yield tx.query(`SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream
     WHERE project_id = $1 AND parent_stream_id IS NULL AND active = true
     ORDER BY name ASC`, [projectId]);
        return rows.map(r => ({
            id: r.id,
            projectId: r.project_id,
            parentStreamId: r.parent_stream_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    });
}
/**
 * Get all child streams for a specific parent stream
 * This is for populating the second dropdown when a parent is selected
 */
function listChildStreams(tx, parentStreamId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verify parent stream exists and user has access
        const { rows: parentRows } = yield tx.query(`SELECT s.id, s.project_id FROM stream s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`, [parentStreamId, organizationId]);
        if (parentRows.length === 0)
            throw (0, errors_1.notFound)('Parent stream not found');
        const { rows } = yield tx.query(`SELECT id, project_id, parent_stream_id, name, description, active, created_at, updated_at
     FROM stream
     WHERE parent_stream_id = $1 AND active = true
     ORDER BY name ASC`, [parentStreamId]);
        return rows.map(r => ({
            id: r.id,
            projectId: r.project_id,
            parentStreamId: r.parent_stream_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    });
}
