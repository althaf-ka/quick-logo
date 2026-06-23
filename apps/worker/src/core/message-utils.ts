import type { QueueMessage, GenerateImageMessage } from "@quicklogo/shared";

export function extractImageId(
  body: QueueMessage | undefined,
): string | undefined {
  if (!body) return undefined;
  if (body.type === "brand-kit-generate" || body.type === "brand-kit-refine") {
    return undefined;
  }
  return (body as GenerateImageMessage).imageId;
}
