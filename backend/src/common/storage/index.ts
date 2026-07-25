import { env } from '@config/env';
import { StorageProvider } from '@common/storage/storage.provider';
import { LocalStorageProvider } from '@common/storage/local.storage';
import { S3StorageProvider } from '@common/storage/s3.storage';

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    instance = env.STORAGE_DRIVER === 's3' ? new S3StorageProvider() : new LocalStorageProvider();
  }
  return instance;
}

export type { StorageProvider, SavedFile } from '@common/storage/storage.provider';
