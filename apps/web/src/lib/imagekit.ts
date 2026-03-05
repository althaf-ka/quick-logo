import { api } from "./api";

export async function uploadFileToImageKit(
  file: File,
  userId: string = "anonymous",
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
  formData.append("folder", `/quick-logo/users/${userId}/references`);

  const uploadRes = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      body: formData,
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
