import type { StorageProvider } from "@quicklogo/storage";

export interface ThumbnailSyncResult {
  url: string;
  fileId: string;
  thumbnail: string;
}

export async function uploadAndSyncThumbnail(
  storage: StorageProvider,
  userId: string,
  projectId: string,
  imageId: string,
  format: string,
  imageData: Uint8Array,
): Promise<ThumbnailSyncResult> {
  const storagePath = `quick-logo/${userId}/${projectId}/${imageId}.${format}`;

  // Delegate strictly to the storage provider interface
  const uploaded = await storage.upload(storagePath, imageData);

  return {
    url: uploaded.url,
    fileId: uploaded.fileId,
    thumbnail: uploaded.thumbnail,
  };
}
