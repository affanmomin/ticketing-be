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
exports.listSubjects = listSubjects;
exports.getSubject = getSubject;
exports.createSubject = createSubject;
exports.updateSubject = updateSubject;
const errors_1 = require("../utils/errors");
function listSubjects(tx, projectId, organizationId, limit, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: projectRows } = yield tx.query(`SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`, [projectId, organizationId]);
        if (projectRows.length === 0)
            throw (0, errors_1.forbidden)('Project not found');
        const { rows: countRows } = yield tx.query('SELECT COUNT(*)::int as total FROM subject WHERE project_id = $1 AND active = true', [projectId]);
        const total = countRows[0].total;
        const { rows } = yield tx.query(`SELECT id, project_id, name, description, active, created_at, updated_at
     FROM subject WHERE project_id = $1 AND active = true
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [projectId, limit, offset]);
        return {
            data: rows.map(r => ({
                id: r.id,
                projectId: r.project_id,
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
function getSubject(tx, subjectId, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query(`SELECT s.id, s.project_id, s.name, s.description, s.active, s.created_at, s.updated_at
     FROM subject s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`, [subjectId, organizationId]);
        if (rows.length === 0)
            throw (0, errors_1.notFound)('Subject not found');
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
function createSubject(tx, organizationId, projectId, name, description) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: projectRows } = yield tx.query(`SELECT p.id FROM project p
     JOIN client c ON c.id = p.client_id
     WHERE p.id = $1 AND c.organization_id = $2`, [projectId, organizationId]);
        if (projectRows.length === 0)
            throw (0, errors_1.forbidden)('Project not found');
        const { rows: existing } = yield tx.query('SELECT id FROM subject WHERE project_id = $1 AND name = $2', [projectId, name]);
        if (existing.length > 0)
            throw (0, errors_1.badRequest)('Subject with this name already exists');
        const { rows } = yield tx.query(`INSERT INTO subject (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, project_id, name, description, active, created_at, updated_at`, [projectId, name, description || null]);
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
function updateSubject(tx, subjectId, organizationId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows: existing } = yield tx.query(`SELECT s.id FROM subject s
     JOIN project p ON p.id = s.project_id
     JOIN client c ON c.id = p.client_id
     WHERE s.id = $1 AND c.organization_id = $2`, [subjectId, organizationId]);
        if (existing.length === 0)
            throw (0, errors_1.notFound)('Subject not found');
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
        if (updateFields.length === 0)
            throw (0, errors_1.badRequest)('No fields to update');
        params.push(subjectId);
        const { rows } = yield tx.query(`UPDATE subject SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, project_id, name, description, active, created_at, updated_at`, params);
        const r = rows[0];
        return {
            id: r.id,
            projectId: r.project_id,
            name: r.name,
            description: r.description,
            active: r.active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    });
}
