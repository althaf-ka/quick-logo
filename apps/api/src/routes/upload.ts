import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ImageKitProvider } from "@quicklogo/storage";
import type { Bindings, Variables } from "../types";

const upload = new Hono<{ Bindings: Bindings; Variables: Variables }>().get(
  "/auth",
  (c) => {
    const { IMAGEKIT_PRIVATE_KEY } = c.env;

    if (!IMAGEKIT_PRIVATE_KEY) {
      throw new HTTPException(500, {
        message: "ImageKit private key is not configured",
      });
    }

    const imagekit = new ImageKitProvider(IMAGEKIT_PRIVATE_KEY);

    return c.json(imagekit.getAuthenticationParameters(), 200);
  },
);

export default upload;
export type UploadType = typeof upload;
