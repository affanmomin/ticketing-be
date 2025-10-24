import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _client: S3Client | null = null;
let _bucket: string | null = null;

function ensureS3() {
  if (_client && _bucket) return { client: _client, Bucket: _bucket };
  const region = process.env.S3_REGION;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  if (!region || !endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('S3 not configured');
  }
  _client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: !!endpoint && !String(endpoint).includes('amazonaws.com'),
  });
  _bucket = bucket;
  return { client: _client, Bucket: _bucket };
}

export async function uploadBuffer(Key: string, Body: Buffer, ContentType: string) {
  const { client, Bucket } = ensureS3();
  await client.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
  return { Key };
}

export async function deleteObject(Key: string) {
  const { client, Bucket } = ensureS3();
  await client.send(new DeleteObjectCommand({ Bucket, Key }));
}

export async function signedPutUrl(Key: string, expires = 900) {
  const { client, Bucket } = ensureS3();
  return getSignedUrl(client, new PutObjectCommand({ Bucket, Key }), { expiresIn: expires });
}

export async function signedGetUrl(Key: string, expires = 3600) {
  const { client, Bucket } = ensureS3();
  return getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), { expiresIn: expires });
}
