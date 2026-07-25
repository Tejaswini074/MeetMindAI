export interface SavedFile {
  key: string;
  url: string;
}

export interface StorageProvider {
  /** Persist a file already written to a local temp path (by Multer) under `key` and return its access URL. */
  save(localTempPath: string, key: string, mimeType: string): Promise<SavedFile>;
  /** Return an absolute/resolvable URL for a previously stored key. */
  getUrl(key: string): string;
  /** Delete a previously stored file. */
  remove(key: string): Promise<void>;
  /** Read a stored file back into a local filesystem path so it can be fed to a local process (e.g. Whisper). */
  toLocalPath(key: string): Promise<string>;
}
