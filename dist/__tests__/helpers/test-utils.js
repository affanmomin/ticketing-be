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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestAdmin = createTestAdmin;
exports.createTestEmployee = createTestEmployee;
exports.createTestClient = createTestClient;
exports.createTestClientUser = createTestClientUser;
exports.createTestProject = createTestProject;
exports.addProjectMember = addProjectMember;
exports.getTaxonomyItem = getTaxonomyItem;
exports.createTestStream = createTestStream;
exports.createTestSubject = createTestSubject;
exports.cleanupTestData = cleanupTestData;
exports.generateTestToken = generateTestToken;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Create a test organization and admin user
 */
function createTestAdmin(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const email = `test-admin-${unique}@example.com`;
        const passwordHash = yield bcryptjs_1.default.hash('TestPass123!', 10);
        const organizationName = `Test Org ${unique}`;
        // Create organization
        const { rows: orgRows } = yield tx.query('INSERT INTO organization (name) VALUES ($1) RETURNING id', [organizationName]);
        const organizationId = orgRows[0].id;
        // Create admin user
        const { rows: userRows } = yield tx.query(`INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`, [organizationId, 'ADMIN', email, 'Test Admin', passwordHash]);
        const userId = userRows[0].id;
        return {
            userId,
            organizationId,
            role: 'ADMIN',
            clientId: null,
            email,
            fullName: 'Test Admin',
        };
    });
}
/**
 * Create a test employee user
 */
function createTestEmployee(tx, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const email = `test-employee-${unique}@example.com`;
        const passwordHash = yield bcryptjs_1.default.hash('TestPass123!', 10);
        const { rows: userRows } = yield tx.query(`INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, true)
     RETURNING id`, [organizationId, 'EMPLOYEE', email, 'Test Employee', passwordHash]);
        const userId = userRows[0].id;
        return {
            userId,
            organizationId,
            role: 'EMPLOYEE',
            clientId: null,
            email,
            fullName: 'Test Employee',
        };
    });
}
/**
 * Create a test client
 */
function createTestClient(tx, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const name = `Test Client ${unique}`;
        const email = `test-client-${unique}@example.com`;
        const { rows } = yield tx.query(`INSERT INTO client (organization_id, name, email, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name, email`, [organizationId, name, email]);
        return {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
        };
    });
}
/**
 * Create a test client user
 */
function createTestClientUser(tx, organizationId, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const email = `test-client-user-${unique}@example.com`;
        const passwordHash = yield bcryptjs_1.default.hash('TestPass123!', 10);
        const { rows: userRows } = yield tx.query(`INSERT INTO app_user (organization_id, user_type, email, full_name, password_hash, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`, [organizationId, 'CLIENT', email, 'Test Client User', passwordHash, clientId]);
        const userId = userRows[0].id;
        return {
            userId,
            organizationId,
            role: 'CLIENT',
            clientId,
            email,
            fullName: 'Test Client User',
        };
    });
}
/**
 * Create a test project
 */
function createTestProject(tx, clientId, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const projectName = name || `Test Project ${unique}`;
        const { rows } = yield tx.query(`INSERT INTO project (client_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name, client_id`, [clientId, projectName, 'Test project description']);
        return {
            id: rows[0].id,
            name: rows[0].name,
            clientId: rows[0].client_id,
        };
    });
}
/**
 * Add a user as a project member
 */
function addProjectMember(tx_1, projectId_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (tx, projectId, userId, role = 'MEMBER', canRaise = true, canBeAssigned = true) {
        yield tx.query(`INSERT INTO project_member (project_id, user_id, role, can_raise, can_be_assigned)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, user_id) DO UPDATE
     SET role = $3, can_raise = $4, can_be_assigned = $5`, [projectId, userId, role, canRaise, canBeAssigned]);
    });
}
/**
 * Get taxonomy items (priority, status, etc.)
 */
function getTaxonomyItem(tx, type, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const table = type === 'priority' ? 'priority' : 'status';
        let query = `SELECT id, name FROM ${table} WHERE is_active = true`;
        const params = [];
        if (name) {
            query += ' AND name = $1';
            params.push(name);
        }
        query += ' LIMIT 1';
        const { rows } = yield tx.query(query, params);
        if (rows.length === 0) {
            throw new Error(`No ${type} found`);
        }
        return { id: rows[0].id, name: rows[0].name };
    });
}
/**
 * Create a test stream
 */
function createTestStream(tx, projectId, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const streamName = name || `Test Stream ${unique}`;
        const { rows } = yield tx.query(`INSERT INTO stream (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name`, [projectId, streamName, 'Test stream description']);
        return { id: rows[0].id, name: rows[0].name };
    });
}
/**
 * Create a test subject
 */
function createTestSubject(tx, projectId, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const unique = Date.now() + Math.random();
        const subjectName = name || `Test Subject ${unique}`;
        const { rows } = yield tx.query(`INSERT INTO subject (project_id, name, description, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name`, [projectId, subjectName, 'Test subject description']);
        return { id: rows[0].id, name: rows[0].name };
    });
}
/**
 * Clean up test data (optional, for cleanup between tests)
 */
function cleanupTestData(tx, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Delete in reverse order of dependencies
        yield tx.query('DELETE FROM ticket WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
        yield tx.query('DELETE FROM stream WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
        yield tx.query('DELETE FROM subject WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
        yield tx.query('DELETE FROM project_member WHERE project_id IN (SELECT id FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1))', [organizationId]);
        yield tx.query('DELETE FROM project WHERE client_id IN (SELECT id FROM client WHERE organization_id = $1)', [organizationId]);
        yield tx.query('DELETE FROM app_user WHERE organization_id = $1', [organizationId]);
        yield tx.query('DELETE FROM client WHERE organization_id = $1', [organizationId]);
        yield tx.query('DELETE FROM organization WHERE id = $1', [organizationId]);
    });
}
/**
 * Generate JWT token for testing
 */
function generateTestToken(server, user) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield server.jwt.sign({
            sub: user.userId,
            organizationId: user.organizationId,
            role: user.role,
            clientId: user.clientId,
        });
    });
}
