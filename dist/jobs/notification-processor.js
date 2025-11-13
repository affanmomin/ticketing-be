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
exports.startNotificationProcessor = startNotificationProcessor;
exports.stopNotificationProcessor = stopNotificationProcessor;
const pool_1 = require("../db/pool");
const outbox_service_1 = require("../services/outbox.service");
let intervalId = null;
let isProcessing = false;
function startNotificationProcessor(intervalMs = 60000) {
    if (intervalId)
        return;
    intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (isProcessing)
            return;
        isProcessing = true;
        const client = yield pool_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield (0, outbox_service_1.processPendingNotifications)(client, 10);
            yield client.query('COMMIT');
            if (result.processed || result.failed) {
                console.log(`[outbox] processed=${result.processed} failed=${result.failed}`);
            }
        }
        catch (error) {
            try {
                yield client.query('ROLLBACK');
            }
            catch (_a) { }
            console.error('[outbox] processing error', error);
        }
        finally {
            client.release();
            isProcessing = false;
        }
    }), intervalMs);
}
function stopNotificationProcessor() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
