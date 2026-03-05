export function generateImageKey(
  userId: string,
  projectId: string,
  imageId: string,
): string {
  return `${userId}/${projectId}/${imageId}.png`;
}
