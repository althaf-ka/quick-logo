import ImageKit, { toFile } from "@imagekit/nodejs";
import type { StorageProvider } from "./types";

export class ImageKitProvider implements StorageProvider {
  private readonly client: ImageKit;

  constructor(privateKey: string) {
    this.client = new ImageKit({ privateKey });
  }

  private splitPath(fullPath: string) {
    const cleanPath = fullPath.replace(/^\//, "");
    const lastSlashIndex = cleanPath.lastIndexOf("/");

    const folder =
      lastSlashIndex !== -1
        ? `/${cleanPath.substring(0, lastSlashIndex)}`
        : "/";
    const fileName =
      lastSlashIndex !== -1
        ? cleanPath.substring(lastSlashIndex + 1)
        : cleanPath;

    return { folder, fileName, cleanPath };
  }

  async upload(
    path: string,
    data: Uint8Array,
  ): Promise<{ url: string; fileId: string; thumbnail: string }> {
    try {
      const { folder, fileName } = this.splitPath(path);
      const file = await toFile(data, fileName);

      const result = await this.client.files.upload({
        file,
        fileName: fileName,
        folder: folder,
        useUniqueFileName: true,
      });

      if (!result.url || !result.fileId || !result.thumbnailUrl) {
        throw new Error("Upload failed: Missing URL or File ID");
      }

      return {
        url: result.url,
        fileId: result.fileId,
        thumbnail: result.thumbnailUrl,
      };
    } catch (error) {
      if (error instanceof ImageKit.APIError) {
        throw new Error(`Upload failed (${error.status}): ${error.message}`);
      }
      throw new Error(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async delete(fileId: string): Promise<void> {
    try {
      await this.client.files.delete(fileId);
    } catch (error) {
      if (error instanceof ImageKit.APIError && error.status === 404) return;
      throw new Error(
        `Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const formattedPath = folderPath.startsWith("/")
        ? folderPath
        : `/${folderPath}`;
      await this.client.folders.delete({ folderPath: formattedPath });
    } catch (error) {
      if (error instanceof ImageKit.APIError && error.status === 404) return;
      throw new Error(
        `Folder delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  getAuthenticationParameters() {
    return this.client.helper.getAuthenticationParameters();
  }
}
