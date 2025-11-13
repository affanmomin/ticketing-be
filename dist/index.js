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
connectDB();
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
