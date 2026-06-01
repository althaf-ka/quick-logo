export function getSocialAssetTargetId(asset: { platform: string; type: string }): string {
  const raw = `${asset.platform}-${asset.type}`;
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric groups with hyphen
    .replace(/-+/g, "-") // collapse duplicate hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}
