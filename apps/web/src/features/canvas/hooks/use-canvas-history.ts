import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasHistory(canvas: fabric.Canvas | null) {
  const setHistoryState = useCanvasStore((s) => s.setHistoryState);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isHistoryChanging = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncStore = useCallback(() => {
    setHistoryState(undoStack.current.length > 1, redoStack.current.length > 0);
  }, [setHistoryState]);

  const serialize = useCallback(() => {
    if (!canvas) return "";
    const json = canvas.toObject([
      "id",
      "name",
      "selectable",
      "evented",
      "locked",
      "zIndex",
    ]);
    json.objects = json.objects.filter(
      (obj: { id?: string }) => obj.id !== "__artboard__",
    );
    return JSON.stringify(json);
  }, [canvas]);

  const load = useCallback(
    async (state: string) => {
      if (!canvas || !state) return Promise.resolve();
      isHistoryChanging.current = true;

      const artboard = canvas.getObjects().find((o) => o.id === "__artboard__");
      const jsonToLoad = JSON.parse(state);

      if (artboard) {
        jsonToLoad.objects.unshift(
          artboard.toObject([
            "id",
            "name",
            "selectable",
            "evented",
            "locked",
            "zIndex",
          ]),
        );
      }

      await canvas.loadFromJSON(jsonToLoad);

      // CRITICAL: Restore custom properties stripped by loadFromJSON
      const loadedObjects = canvas.getObjects();
      const jsonObjects = jsonToLoad.objects || [];
      type CustomFabricObject = fabric.Object & { id?: string; name?: string };
      loadedObjects.forEach((obj: fabric.FabricObject, i: number) => {
        const src = jsonObjects[i];
        const customObj = obj as CustomFabricObject;
        if (src?.id) customObj.id = src.id;
        if (src?.name) customObj.name = src.name;
      });

      canvas.requestRenderAll();
      isHistoryChanging.current = false;
      syncStore();
    },
    [canvas, syncStore],
  );

  // Setup auto-save listeners
  useEffect(() => {
    if (!canvas) return;

    // Push initial empty canvas state
    if (undoStack.current.length === 0) {
      setTimeout(() => {
        undoStack.current.push(serialize());
        syncStore();
      }, 100);
    }

    const saveState = () => {
      if (isHistoryChanging.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (isHistoryChanging.current) return;

        const state = serialize();

        // Don't save if state hasn't changed from the top of the stack
        if (
          undoStack.current.length > 0 &&
          undoStack.current[undoStack.current.length - 1] === state
        ) {
          return;
        }

        undoStack.current.push(state);
        if (undoStack.current.length > 50) {
          undoStack.current.shift();
        }
        redoStack.current = [];
        syncStore();
      }, 300);
    };

    const handleEvent = () => saveState();

    canvas.on("object:added", handleEvent);
    canvas.on("object:removed", handleEvent);
    canvas.on("object:modified", handleEvent);
    canvas.on("path:created", handleEvent);
    canvas.on("text:changed", handleEvent);

    return () => {
      canvas.off("object:added", handleEvent);
      canvas.off("object:removed", handleEvent);
      canvas.off("object:modified", handleEvent);
      canvas.off("path:created", handleEvent);
      canvas.off("text:changed", handleEvent);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [canvas, serialize, syncStore]);

  // Setup history controls
  useEffect(() => {
    if (!canvas) return;

    const handleUndo = () => {
      if (undoStack.current.length <= 1 || isHistoryChanging.current) return;

      const current = undoStack.current.pop();
      if (current) {
        redoStack.current.push(current);
      }

      const prev = undoStack.current[undoStack.current.length - 1];
      if (prev) {
        load(prev);
      }
    };

    const handleRedo = () => {
      if (redoStack.current.length === 0 || isHistoryChanging.current) return;

      const next = redoStack.current.pop();
      if (!next) return;

      undoStack.current.push(next);
      load(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (canvas && (canvas.getActiveObject() as fabric.IText)?.isEditing)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const state = useCanvasStore.getState();

        if (e.shiftKey) {
          if (state.canvasMode !== "inpaint") {
            handleRedo();
          }
        } else {
          if (state.canvasMode === "inpaint") {
            window.dispatchEvent(new Event("canvas:mask:undo"));
          } else {
            handleUndo();
          }
        }
      }
    };

    const handleCustomUndo = () => {
      const state = useCanvasStore.getState();
      if (state.canvasMode === "inpaint") {
        window.dispatchEvent(new Event("canvas:mask:undo"));
      } else {
        handleUndo();
      }
    };
    const handleCustomRedo = () => {
      const state = useCanvasStore.getState();
      if (state.canvasMode !== "inpaint") {
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("canvas:undo", handleCustomUndo);
    window.addEventListener("canvas:redo", handleCustomRedo);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("canvas:undo", handleCustomUndo);
      window.removeEventListener("canvas:redo", handleCustomRedo);
    };
  }, [canvas, load]);
}
