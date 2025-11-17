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
const pool_1 = require("./db/pool");
const server_1 = __importDefault(require("./server"));
const notification_processor_1 = require("./jobs/notification-processor");
const email_service_1 = require("./services/email.service");
const port = Number(process.env.PORT) || 3000;
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Connecting to Supabase PostgreSQL...');
            // Test connection by getting a client from the pool
            const testClient = yield pool_1.pool.connect();
            yield testClient.query('SELECT 1');
            testClient.release();
            console.log('Connected to Supabase PostgreSQL!');
        }
        catch (err) {
            console.error('Connection error:', err);
        }
    });
}
function verifyEmailService() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Verifying email service connection...');
            // Don't block server startup if email verification fails
            // Run verification in background with timeout
            const timeoutMs = 20000; // 20 seconds max
            const verificationPromise = email_service_1.emailService.testConnection();
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('⚠️  Email verification timed out. Server will start anyway.');
                    console.warn('   Emails may not work if SMTP is blocked by your hosting provider.');
                    resolve(false);
                }, timeoutMs);
            });
            const isConnected = yield Promise.race([verificationPromise, timeoutPromise]);
            if (isConnected) {
                console.log('✅ Email service connection verified successfully');
            }
            else {
                console.warn('⚠️  Email service connection verification failed. Emails may not send.');
                console.warn('   The server will continue to run, but email functionality may be unavailable.');
            }
        }
        catch (err) {
            console.error('❌ Email service verification error:', err);
            console.warn('⚠️  Email service may not work correctly. Check SMTP configuration.');
            console.warn('   Server will continue to run despite email verification failure.');
        }
    });
}
connectDB();
verifyEmailService();
(0, notification_processor_1.startNotificationProcessor)();
server_1.default.listen({
    port,
    host: '0.0.0.0',
}, (err, address) => {
    if (err) {
        server_1.default.log.error(err);
        process.exit(1);
    }
    server_1.default.log.info(`Server running on ${address}`);
});
