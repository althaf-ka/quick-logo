export interface StorageProvider {
  upload(
    path: string,
    data: Uint8Array,
  ): Promise<{ url: string; fileId: string; thumbnail: string }>;
  delete(fileId: string): Promise<void>;
  deleteFolder(folderPath: string): Promise<void>;
  getAuthenticationParameters(): {
    token: string;
    expire: number;
    signature: string;
  };
}
