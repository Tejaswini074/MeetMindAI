import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '@config/env';
import { AppError } from '@common/errors/AppError';
import { SavedFile, StorageProvider } from '@common/storage/storage.provider';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.AWS_S3_BUCKET || !env.AWS_REGION) {
      throw AppError.internal('S3 storage is not configured (AWS_S3_BUCKET / AWS_REGION missing)');
    }
    this.bucket = env.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    });
  }

  async save(localTempPath: string, key: string, mimeType: string): Promise<SavedFile> {
    const body = fs.createReadStream(localTempPath);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType }),
    );
    await fs.promises.unlink(localTempPath).catch(() => undefined);
    return { key, url: this.getUrl(key) };
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async toLocalPath(key: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const tempPath = path.join(os.tmpdir(), `meetmind-${Date.now()}-${path.basename(key)}`);
    const writeStream = fs.createWriteStream(tempPath);
    await new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response.Body as any)
        .pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', reject);
    });
    return tempPath;
  }
}
