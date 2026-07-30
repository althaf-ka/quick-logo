import * as fabric from "fabric";

export const FABRIC_CUSTOM_PROPERTIES = [
  "id",
  "name",
  "selectable",
  "evented",
  "locked",
  "hoverCursor",
  "generationGroupId",
  "generatedFromObjectId",
];

export type CustomFabricObject = fabric.Object & {
  id?: string;
  name?: string;
  locked?: boolean;
  hoverCursor?: string;
  generationGroupId?: string;
  generatedFromObjectId?: string;
};

export function restoreCustomProperties(
  canvas: fabric.Canvas,
  jsonToLoad: { objects?: Record<string, unknown>[] },
) {
  const loadedObjects = canvas.getObjects();
  const jsonObjects = jsonToLoad.objects || [];

  loadedObjects.forEach((obj: fabric.FabricObject, i: number) => {
    const src = jsonObjects[i];
    if (!src) return;

    const customObj = obj as CustomFabricObject;
    FABRIC_CUSTOM_PROPERTIES.forEach((prop) => {
      if (src[prop] !== undefined) {
        Reflect.set(customObj, prop, src[prop]);
      }
    });
  });
}
