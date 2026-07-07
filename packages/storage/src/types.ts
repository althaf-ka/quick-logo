export interface UploadOptions {
  /**
   * When true, upload to a deterministic path (no unique suffix) so repeated
   * uploads of the same key overwrite instead of leaking duplicate objects.
   * Use for idempotent, retry-safe assets (e.g. brand-kit assets).
   */
  overwrite?: boolean;
}

export interface StorageProvider {
  upload(
    path: string,
    data: Uint8Array,
    options?: UploadOptions,
  ): Promise<{ url: string; fileId: string; thumbnail: string }>;
  delete(fileId: string): Promise<void>;
  deleteFolder(folderPath: string): Promise<void>;
  getAuthenticationParameters(): {
    token: string;
    expire: number;
    signature: string;
  };
}
