import * as fabric from "fabric";

/**
 * Multi-strategy artboard discovery:
 * 1. Exact ID match ("__artboard__")
 * 2. Exact Name match ("Artboard")
 * 3. Fallback characteristics: non-selectable rectangle at 0,0 with reasonable size
 */
export function findArtboard(canvas: fabric.Canvas): fabric.Object | null {
  const objects = canvas.getObjects();

  const byId = objects.find((o) => o.id === "__artboard__");
  if (byId) return byId;

  const byName = objects.find((o) => (o as fabric.Object & { name?: string }).name === "Artboard");
  if (byName) return byName;

  // Last resort: find first non-selectable rect at origin with reasonable size
  const byShape = objects.find(
    (o) =>
      o.type === "rect" &&
      (o.left || 0) < 1 &&
      (o.top || 0) < 1 &&
      !o.selectable &&
      (o.width || 0) >= 100
  );
  return byShape || null;
}
