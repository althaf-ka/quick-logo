import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";

export function useCanvasHistory(canvas: fabric.Canvas | null) {
  const { setHistoryState } = useCanvasStore();
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isHistoryChanging = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncStore = () => {
    setHistoryState(undoStack.current.length > 1, redoStack.current.length > 0);
  };

  const serialize = () => {
    if (!canvas) return "";
    const json = (canvas as any).toJSON([
      "id",
      "name",
      "selectable",
      "evented",
      "locked",
      "zIndex",
    ]);
    json.objects = json.objects.filter((obj: any) => obj.id !== "__artboard__");
    return JSON.stringify(json);
  };

  const load = (state: string) => {
    if (!canvas || !state) return Promise.resolve();
    isHistoryChanging.current = true;

    const artboard = canvas
      .getObjects()
      .find((o) => (o as any).id === "__artboard__");
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

    return canvas.loadFromJSON(jsonToLoad).then(() => {
      canvas.requestRenderAll();
      isHistoryChanging.current = false;
      syncStore();
    });
  };

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
  }, [canvas]);

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
        (canvas && (canvas.getActiveObject() as any)?.isEditing)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    const handleCustomUndo = () => handleUndo();
    const handleCustomRedo = () => handleRedo();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("canvas:undo", handleCustomUndo);
    window.addEventListener("canvas:redo", handleCustomRedo);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("canvas:undo", handleCustomUndo);
      window.removeEventListener("canvas:redo", handleCustomRedo);
    };
  }, [canvas]);
}
