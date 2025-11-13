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
exports.uploadBuffer = uploadBuffer;
exports.deleteObject = deleteObject;
exports.signedPutUrl = signedPutUrl;
exports.signedGetUrl = signedGetUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let _client = null;
let _bucket = null;
function ensureS3() {
    if (_client && _bucket)
        return { client: _client, Bucket: _bucket };
    const region = process.env.S3_REGION;
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;
    if (!region || !endpoint || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error('S3 not configured');
    }
    _client = new client_s3_1.S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: !!endpoint && !String(endpoint).includes('amazonaws.com'),
    });
    _bucket = bucket;
    return { client: _client, Bucket: _bucket };
}
function uploadBuffer(Key, Body, ContentType) {
    return __awaiter(this, void 0, void 0, function* () {
        const { client, Bucket } = ensureS3();
        yield client.send(new client_s3_1.PutObjectCommand({ Bucket, Key, Body, ContentType }));
        return { Key };
    });
}
function deleteObject(Key) {
    return __awaiter(this, void 0, void 0, function* () {
        const { client, Bucket } = ensureS3();
        yield client.send(new client_s3_1.DeleteObjectCommand({ Bucket, Key }));
    });
}
function signedPutUrl(Key_1) {
    return __awaiter(this, arguments, void 0, function* (Key, expires = 900) {
        const { client, Bucket } = ensureS3();
        return (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.PutObjectCommand({ Bucket, Key }), { expiresIn: expires });
    });
}
function signedGetUrl(Key_1) {
    return __awaiter(this, arguments, void 0, function* (Key, expires = 3600) {
        const { client, Bucket } = ensureS3();
        return (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({ Bucket, Key }), { expiresIn: expires });
    });
}
