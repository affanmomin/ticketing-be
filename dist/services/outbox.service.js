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
exports.listPendingNotifications = listPendingNotifications;
exports.markDelivered = markDelivered;
exports.incrementAttempts = incrementAttempts;
exports.processNotification = processNotification;
exports.processPendingNotifications = processPendingNotifications;
function listPendingNotifications(tx_1) {
    return __awaiter(this, arguments, void 0, function* (tx, limit = 100) {
        const { rows } = yield tx.query(`SELECT id, topic, ticket_id, recipient_user_id, payload, attempts, delivered_at, created_at
     FROM notification_outbox
     WHERE delivered_at IS NULL
     ORDER BY created_at ASC
     LIMIT $1`, [limit]);
        return rows.map(r => ({
            id: r.id,
            topic: r.topic,
            ticketId: r.ticket_id,
            recipientUserId: r.recipient_user_id,
            payload: r.payload,
            attempts: r.attempts,
            deliveredAt: r.delivered_at,
            createdAt: r.created_at,
        }));
    });
}
function markDelivered(tx, outboxId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield tx.query('UPDATE notification_outbox SET delivered_at = NOW() WHERE id = $1', [outboxId]);
    });
}
function incrementAttempts(tx, outboxId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield tx.query('UPDATE notification_outbox SET attempts = attempts + 1 WHERE id = $1', [outboxId]);
    });
}
// Placeholder send function
function sendNotification(_notification) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: integrate with email/webhook/queue
    });
}
function processNotification(tx, outboxId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield tx.query('SELECT id, topic, ticket_id, recipient_user_id, payload, attempts, delivered_at, created_at FROM notification_outbox WHERE id = $1', [outboxId]);
        if (rows.length === 0)
            return { success: false, error: 'Notification not found' };
        const notification = {
            id: rows[0].id,
            topic: rows[0].topic,
            ticketId: rows[0].ticket_id,
            recipientUserId: rows[0].recipient_user_id,
            payload: rows[0].payload,
            attempts: rows[0].attempts,
            deliveredAt: rows[0].delivered_at,
            createdAt: rows[0].created_at,
        };
        try {
            yield sendNotification(notification);
            yield markDelivered(tx, outboxId);
            return { success: true };
        }
        catch (error) {
            yield incrementAttempts(tx, outboxId);
            return { success: false, error: error.message };
        }
    });
}
function processPendingNotifications(tx_1) {
    return __awaiter(this, arguments, void 0, function* (tx, limit = 10) {
        const notifications = yield listPendingNotifications(tx, limit);
        let processed = 0;
        let failed = 0;
        for (const notification of notifications) {
            const result = yield processNotification(tx, notification.id);
            if (result.success)
                processed += 1;
            else
                failed += 1;
        }
        return { processed, failed };
    });
}
