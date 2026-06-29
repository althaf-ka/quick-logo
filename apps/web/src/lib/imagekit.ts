import { api } from "./api";

export async function uploadFileToImageKit(
  file: File,
  userId: string = "anonymous",
  options?: {
    isTemp?: boolean;
    folder?: string;
    tags?: string[];
    signal?: AbortSignal;
  },
): Promise<string> {
  const authRes = await api.upload.auth.$get();

  if (!authRes.ok) {
    throw new Error("Failed to authenticate upload request");
  }

  const auth = await authRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name || "reference.png");

  formData.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "");
  formData.append("signature", auth.signature);
  formData.append("expire", auth.expire.toString());
  formData.append("token", auth.token);
  let folder = `/quick-logo/users/${userId}/references`;
  if (options?.folder) {
    folder = options.folder;
  } else if (options?.isTemp) {
    // Much cleaner: a single, shared temp folder since these are meant to be deleted.
    folder = `/quick-logo/temp`;
  }
  formData.append("folder", folder);

  if (options?.tags && options.tags.length > 0) {
    formData.append("tags", options.tags.join(","));
  }

  const uploadRes = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      body: formData,
      signal: options?.signal,
    },
  );

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json();
    throw new Error(
      errorData.message || "Failed to upload image directly to ImageKit",
    );
  }

  const data = await uploadRes.json();

  // Return the CDN URL to be stored in the DB alongside the generation request
  return data.url;
}
