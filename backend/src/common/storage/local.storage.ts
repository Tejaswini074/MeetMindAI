import fs from 'fs/promises';
import path from 'path';
import { env } from '@config/env';
import { SavedFile, StorageProvider } from '@common/storage/storage.provider';

const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.join(process.cwd(), env.UPLOAD_DIR);

export class LocalStorageProvider implements StorageProvider {
  async save(localTempPath: string, key: string, _mimeType: string): Promise<SavedFile> {
    const destPath = path.join(uploadRoot, key);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(localTempPath, destPath);
    await fs.unlink(localTempPath).catch(() => undefined);
    return { key, url: this.getUrl(key) };
  }

  getUrl(key: string): string {
    return `${env.APP_URL}/uploads/${key.split(path.sep).join('/')}`;
  }

  async remove(key: string): Promise<void> {
    const filePath = path.join(uploadRoot, key);
    await fs.unlink(filePath).catch(() => undefined);
  }

  async toLocalPath(key: string): Promise<string> {
    return path.join(uploadRoot, key);
  }
}
