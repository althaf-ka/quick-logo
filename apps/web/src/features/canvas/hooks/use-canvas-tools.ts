import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import type { CanvasObjectInfo, SelectedObjectProps } from "../types/canvas";

// We assign a unique id to objects if they don't have one
let idCounter = 0;
const generateId = () => `obj_${Date.now()}_${idCounter++}`;

export function useCanvasTools(canvas: fabric.Canvas | null) {
  const {
    activeTool,
    setActiveTool,
    activeShape,
    brushSettings,
    setBrushSettings,
    setSelectedObject,
    setSelectedObjects,
    setSelectionType,
    setLayers,
    canvasMode,
  } = useCanvasStore();

  // Mode-aware tool switching
  useEffect(() => {
    if (canvasMode === "sketch2img") {
      setActiveTool("pencil");
      // Use a glowing violet color for the AI sketch tool
      setBrushSettings({ width: 4, color: "#8B5CF6", opacity: 1 });
    } else if (canvasMode === "img2img") {
      setActiveTool("select");
      // We don't discard active object for img2img so the user can just select an image.
    } else if (canvasMode === "inpaint") {
      if (canvas) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [canvasMode, setActiveTool, setBrushSettings, canvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (canvas && (canvas.getActiveObject() as any)?.isEditing)
      ) {
        return;
      }

      if (canvas) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const step = e.shiftKey ? 10 : 1;
          let moved = false;
          switch (e.key) {
            case "ArrowLeft":
              e.preventDefault();
              activeObj.set("left", (activeObj.left || 0) - step);
              moved = true;
              break;
            case "ArrowRight":
              e.preventDefault();
              activeObj.set("left", (activeObj.left || 0) + step);
              moved = true;
              break;
            case "ArrowUp":
              e.preventDefault();
              activeObj.set("top", (activeObj.top || 0) - step);
              moved = true;
              break;
            case "ArrowDown":
              e.preventDefault();
              activeObj.set("top", (activeObj.top || 0) + step);
              moved = true;
              break;
          }
          if (moved) {
            activeObj.setCoords();
            canvas.requestRenderAll();
            canvas.fire("object:modified", { target: activeObj });
            return;
          }
        }
      }

      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (key) {
        case "v":
          setActiveTool("select");
          break;
        case "t":
          setActiveTool("text");
          break;
        case "p":
          setActiveTool("pencil");
          break;
        case "s":
          setActiveTool("shapes");
          break;
        case "i":
          const fileInput = document.querySelector(
            'input[type="file"][accept="image/*"]',
          ) as HTMLInputElement;
          if (fileInput) fileInput.click();
          break;
        case "e":
          setActiveTool("eraser");
          break;
        case "h":
          setActiveTool("hand");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas, setActiveTool]);

  // Sync canvas state to store (selection & layers)
  useEffect(() => {
    if (!canvas) return;

    const syncSelection = () => {
      const activeObjects = canvas.getActiveObjects();

      if (
        !activeObjects ||
        activeObjects.length === 0 ||
        activeObjects.every((o) => (o as any).id === "__artboard__")
      ) {
        setSelectedObject(null);
        setSelectedObjects([]);
        setSelectionType("none");
        return;
      }

      if (activeObjects.length > 1) {
        setSelectedObject(null);
        setSelectedObjects(
          activeObjects.map((obj) => ({
            id: (obj as any).id,
            type: obj.type,
            left: Math.round(obj.left || 0),
            top: Math.round(obj.top || 0),
            width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
            height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
            angle: Math.round(obj.angle || 0),
            opacity: Math.round((obj.opacity || 1) * 100),
            fill: obj.fill?.toString() || "#000000",
            stroke: obj.stroke?.toString() || "#000000",
            strokeWidth: obj.strokeWidth || 0,
          })),
        );
        setSelectionType("multi");
        return;
      }

      const active = activeObjects[0];

      const props: SelectedObjectProps = {
        id: (active as any).id,
        type: active.type,
        left: Math.round(active.left || 0),
        top: Math.round(active.top || 0),
        width: Math.round((active.width || 0) * (active.scaleX || 1)),
        height: Math.round((active.height || 0) * (active.scaleY || 1)),
        angle: Math.round(active.angle || 0),
        opacity: Math.round((active.opacity || 1) * 100),
        fill: active.fill?.toString() || "#000000",
        stroke: active.stroke?.toString() || "#000000",
        strokeWidth: active.strokeWidth || 0,
      };

      if (active.type === "textbox" || active.type === "text") {
        const textObj = active as fabric.Textbox;
        props.fontFamily = textObj.fontFamily;
        props.fontSize = textObj.fontSize;
        props.fontWeight = textObj.fontWeight?.toString();
        props.fontStyle = textObj.fontStyle;
        props.textAlign = textObj.textAlign;
        props.text = textObj.text;
      }
      setSelectedObject(props);
      setSelectedObjects([props]);
      setSelectionType("single");
    };

    const syncLayers = () => {
      const objects = canvas
        .getObjects()
        .filter((o) => (o as any).id !== "__artboard__");

      // Ensure all objects have an ID and Name
      objects.forEach((obj: any, idx) => {
        if (!obj.id) obj.id = generateId();
        if (!obj.name) obj.name = `${obj.type} ${idx + 1}`;
      });

      const layerList: CanvasObjectInfo[] = objects
        .map((obj: any, idx) => ({
          id: obj.id,
          type: obj.type,
          name: obj.name,
          visible: obj.visible ?? true,
          locked: !!obj.get("locked"),
          zIndex: idx,
        }))
        .reverse(); // Reverse to show topmost first

      setLayers(layerList);
    };

    const handleEvent = () => {
      syncSelection();
      syncLayers();
    };

    const handlePathCreated = (e: any) => {
      if (e.path) {
        const currentMode = useCanvasStore.getState().canvasMode;
        const isSketch = currentMode === "sketch2img";
        e.path.set({
          perPixelTargetFind: true,
          id: generateId(),
          name: isSketch ? "AI Sketch" : "Drawing",
          isAiSketch: isSketch,
        });
        handleEvent();
      }
    };

    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", syncSelection);
    canvas.on("object:modified", handleEvent);
    canvas.on("object:added", handleEvent);
    canvas.on("object:removed", handleEvent);
    canvas.on("path:created", handlePathCreated);

    // Initial sync
    syncLayers();

    return () => {
      canvas.off("selection:created", syncSelection);
      canvas.off("selection:updated", syncSelection);
      canvas.off("selection:cleared", syncSelection);
      canvas.off("object:modified", handleEvent);
      canvas.off("object:added", handleEvent);
      canvas.off("object:removed", handleEvent);
      canvas.off("path:created", handlePathCreated);
    };
  }, [canvas, setSelectedObject, setLayers]);

  // Handle Image import & properties panel actions
  useEffect(() => {
    if (!canvas) return;

    const handleAddImage = (e: Event) => {
      const file = (e as CustomEvent).detail?.file as File;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (f) => {
        const data = f.target?.result as string;
        const FabricImageClass = (fabric as any).FabricImage || fabric.Image;
        FabricImageClass.fromURL(data).then((img: fabric.Image) => {
          (img as any).id = generateId();
          img.set({
            left: canvas.width ? canvas.width / 2 : 100,
            top: canvas.height ? canvas.height / 2 : 100,
            originX: "center",
            originY: "center",
          });
          img.scaleToWidth(Math.min(300, canvas.width || 300));
          canvas.add(img);
          canvas.setActiveObject(img);
          setActiveTool("select");
          canvas.requestRenderAll();
        });
      };
      reader.readAsDataURL(file);
    };

    const handleUpdateObject = (e: Event) => {
      const { detail } = e as CustomEvent;
      const active = canvas.getActiveObject();
      if (active) {
        if (detail.fontFamily && active.type === "textbox") {
          (active as fabric.Textbox).set({ fontFamily: detail.fontFamily });
        }

        // Handle dimension scaling rather than literal width/height for standard objects
        if (detail.scaleX !== undefined && active.width) {
          active.set({ scaleX: detail.scaleX });
        }
        if (detail.scaleY !== undefined && active.height) {
          active.set({ scaleY: detail.scaleY });
        }

        // Remove scale properties from detail before applying rest
        const { scaleX, scaleY, ...rest } = detail;
        active.set(rest);

        active.setCoords();
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: active });
      }
    };

    const handleDeleteObject = () => {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    };

    const handleFlattenImage = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => (o as any).id === id);
      if (obj && (obj.type === "image" || obj.type === "Image")) {
        const objects = canvas.getObjects();
        const index = objects.indexOf(obj);
        if (index > 0) {
          const belowObj = objects[index - 1];
          if ((belowObj as any).id === "__artboard__" || !belowObj) {
            return; // Can't flatten with artboard
          }

          // Group them temporarily to get the bounding box and data URL
          const group = new fabric.Group([belowObj, obj], { canvas });
          const dataUrl = group.toDataURL({ format: "png" });

          // Re-import as a single image
          const FabricImageClass = (fabric as any).FabricImage || fabric.Image;
          FabricImageClass.fromURL(dataUrl).then((img: fabric.Image) => {
            (img as any).id = generateId();
            img.set({
              left: group.left,
              top: group.top,
              scaleX: 1,
              scaleY: 1,
              name: "Flattened Image",
            });

            canvas.remove(belowObj);
            canvas.remove(obj);

            // insertAt is not always available in v6, use insertAt or add/moveTo
            canvas.insertAt(index - 1, img);

            canvas.setActiveObject(img);
            canvas.requestRenderAll();
          });
        }
      }
    };

    const handleDuplicateObject = () => {
      const active = canvas.getActiveObject();
      if (active) {
        active.clone().then((cloned: fabric.Object | any) => {
          cloned.set({
            left: (active.left || 0) + 20,
            top: (active.top || 0) + 20,
            evented: true,
          });
          cloned.id = generateId(); // Ensure new ID

          if (cloned.type === "activeSelection") {
            cloned.canvas = canvas;
            cloned.forEachObject((obj: any) => {
              obj.id = generateId();
              canvas.add(obj);
            });
            cloned.setCoords();
          } else {
            canvas.add(cloned);
          }
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        });
      }
    };

    const handleReorderObject = (e: Event) => {
      const { id, action } = (e as CustomEvent).detail;
      const obj =
        canvas.getObjects().find((o) => (o as any).id === id) ||
        canvas.getActiveObject();
      if (obj) {
        if (action === "front") canvas.bringObjectToFront(obj);
        if (action === "back") {
          canvas.sendObjectToBack(obj);
          const artboard = canvas
            .getObjects()
            .find((o) => (o as any).id === "__artboard__");
          if (artboard) canvas.sendObjectToBack(artboard);
        }
        if (action === "forward") canvas.bringObjectForward(obj);
        if (action === "backward") {
          canvas.sendObjectBackwards(obj);
          const objects = canvas.getObjects();
          if (
            objects[0] === obj &&
            objects.length > 1 &&
            (objects[1] as any).id === "__artboard__"
          ) {
            canvas.bringObjectForward(obj);
          }
        }
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: obj });
      }
    };

    const handleToggleLayer = (e: Event) => {
      const { id, prop } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => (o as any).id === id);
      if (obj) {
        if (prop === "visible") obj.set({ visible: !obj.visible });
        if (prop === "locked") {
          const isLocked = !obj.get("locked");
          obj.set({
            locked: isLocked,
            selectable: !isLocked,
            evented: !isLocked,
            hoverCursor: isLocked ? "default" : "move",
          });
          if (isLocked) canvas.discardActiveObject();
        }
        canvas.requestRenderAll();
        canvas.fire("object:modified", { target: obj });
      }
    };

    const handleSelectObject = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const obj = canvas.getObjects().find((o) => (o as any).id === id);
      if (obj && !obj.get("locked")) {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      }
    };

    window.addEventListener("canvas:add-image", handleAddImage);
    window.addEventListener("canvas:update-object", handleUpdateObject);
    window.addEventListener("canvas:delete-object", handleDeleteObject);
    window.addEventListener("canvas:flatten-image", handleFlattenImage);
    window.addEventListener("canvas:duplicate-object", handleDuplicateObject);
    window.addEventListener("canvas:reorder-object", handleReorderObject);
    window.addEventListener("canvas:toggle-layer", handleToggleLayer);
    window.addEventListener("canvas:select-object", handleSelectObject);

    return () => {
      window.removeEventListener("canvas:add-image", handleAddImage);
      window.removeEventListener("canvas:update-object", handleUpdateObject);
      window.removeEventListener("canvas:delete-object", handleDeleteObject);
      window.removeEventListener("canvas:flatten-image", handleFlattenImage);
      window.removeEventListener(
        "canvas:duplicate-object",
        handleDuplicateObject,
      );
      window.removeEventListener("canvas:reorder-object", handleReorderObject);
      window.removeEventListener("canvas:toggle-layer", handleToggleLayer);
      window.removeEventListener("canvas:select-object", handleSelectObject);
    };
  }, [canvas, setActiveTool]);

  // Sync active tool to fabric canvas state
  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "default";

    // Auto-cleanup any abandoned AI sketches if we leave sketch2img mode
    if (canvasMode !== "sketch2img") {
      let removedAny = false;
      canvas.getObjects().forEach((obj) => {
        if ((obj as any).isAiSketch) {
          canvas.remove(obj);
          removedAny = true;
        }
      });
      if (removedAny) canvas.requestRenderAll();
    }

    const isAiModeWithoutSelection = canvasMode === "inpaint";

    canvas.forEachObject((obj) => {
      if (!obj.get("locked") && (obj as any).id !== "__artboard__") {
        if (
          activeTool === "hand" ||
          activeTool === "shapes" ||
          activeTool === "eraser"
        ) {
          obj.set({ selectable: false, evented: false });
        } else if (activeTool === "text") {
          const isText =
            obj.type === "textbox" ||
            obj.type === "text" ||
            obj.type === "i-text";
          obj.set({ selectable: isText, evented: isText });
        } else {
          if (canvasMode === "img2img") {
            // AI Improve mode: Objects are selectable targets, but NOT editable
            obj.set({
              selectable: true,
              evented: true,
              hasControls: false, // Removes the resize/rotate circles
              hasBorders: true,
              lockMovementX: true, // Prevents dragging
              lockMovementY: true,
              borderColor: "#4C1D95", // Distinct dark professional purple for AI targets
              borderScaleFactor: 6, // Much thicker boundary so it's easily noticeable
            });
          } else {
            // Normal Edit Mode
            obj.set({
              selectable: !isAiModeWithoutSelection,
              evented: !isAiModeWithoutSelection,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              borderColor: "#6D28D9", // Restore default theme color
              borderScaleFactor: 2,
            });
          }
        }
      }
    });

    switch (activeTool) {
      case "select":
        canvas.selection = true;
        break;
      case "text":
        canvas.defaultCursor = "text";
        break;
      case "pencil":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = brushSettings.color;
        canvas.freeDrawingBrush.width = brushSettings.width;
        break;
      case "shapes":
        canvas.defaultCursor = "crosshair";
        break;
      case "eraser":
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "cell";
        break;
      case "hand":
        canvas.defaultCursor = "grab";
        break;
    }

    canvas.requestRenderAll();
  }, [activeTool, canvas, brushSettings, canvasMode]);

  // Handle pointer interactions based on active tool
  useEffect(() => {
    if (!canvas) return;

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let shapeRef: fabric.Object | null = null;
    let originX = 0;
    let originY = 0;

    const onMouseDown = (opt: fabric.TEvent) => {
      const e = opt.e as MouseEvent;
      const pointer = canvas.getPointer(opt.e);

      if (activeTool === "hand") {
        isDragging = true;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        canvas.setCursor("grabbing");
      } else if (activeTool === "text") {
        const target = (opt as any).target;
        if (
          target &&
          (target.type === "textbox" ||
            target.type === "text" ||
            target.type === "i-text")
        ) {
          return; // Let fabric handle existing text editing
        }

        const text = new fabric.Textbox("Type here", {
          left: pointer.x,
          top: pointer.y,
          width: 200,
          fontSize: 32,
          fontFamily: "Inter",
          fill: brushSettings.color,
        }) as any;
        text.id = generateId();

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool("select");
        canvas.requestRenderAll();
      } else if (activeTool === "eraser") {
        isDragging = true;
        const target = (opt as any).target;
        if (
          target &&
          target.id !== "__artboard__" &&
          target.id !== "obj_initial_image" &&
          target.id !== "__ai_region__" &&
          target.type !== "image" &&
          target.type !== "Image" &&
          target.type !== "image:FabricImage"
        ) {
          canvas.remove(target);
          canvas.requestRenderAll();
        }
      } else if (activeTool === "shapes") {
        isDragging = true;
        originX = pointer.x;
        originY = pointer.y;

        const commonProps = {
          left: originX,
          top: originY,
          fill: "transparent",
          stroke: brushSettings.color,
          strokeWidth: brushSettings.width,
        };

        if (activeShape === "rectangle") {
          shapeRef = new fabric.Rect({ ...commonProps, width: 0, height: 0 });
        } else if (activeShape === "circle") {
          shapeRef = new fabric.Circle({ ...commonProps, radius: 0 });
        } else if (activeShape === "line" || activeShape === "arrow") {
          shapeRef = new fabric.Line(
            [originX, originY, originX, originY],
            commonProps,
          );
        } else if (activeShape === "triangle") {
          shapeRef = new fabric.Triangle({
            ...commonProps,
            width: 0,
            height: 0,
          });
        }

        if (shapeRef) {
          (shapeRef as any).id = generateId();
          canvas.add(shapeRef);
        }
      }
    };

    const onMouseMove = (opt: fabric.TEvent) => {
      const e = opt.e as MouseEvent;
      if (!isDragging) return;

      if (activeTool === "hand") {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = e.clientX;
          lastPosY = e.clientY;
        }
      } else if (activeTool === "eraser" && isDragging) {
        const target = (opt as any).target;
        if (
          target &&
          target.id !== "__artboard__" &&
          target.id !== "obj_initial_image" &&
          target.id !== "__ai_region__" &&
          target.type !== "image" &&
          target.type !== "Image" &&
          target.type !== "image:FabricImage"
        ) {
          canvas.remove(target);
          canvas.requestRenderAll();
        }
      } else if (activeTool === "shapes" && shapeRef) {
        const pointer = canvas.getPointer(opt.e);

        if (activeShape === "rectangle") {
          const rect = shapeRef as fabric.Rect;
          rect.set({
            width: Math.abs(pointer.x - originX),
            height: Math.abs(pointer.y - originY),
          });
          if (pointer.x < originX) rect.set({ left: pointer.x });
          if (pointer.y < originY) rect.set({ top: pointer.y });
        } else if (activeShape === "circle") {
          const circle = shapeRef as fabric.Circle;
          const radius = Math.abs(pointer.x - originX) / 2;
          circle.set({ radius });
          if (pointer.x < originX) circle.set({ left: pointer.x });
          if (pointer.y < originY) circle.set({ top: pointer.y });
        } else if (activeShape === "line" || activeShape === "arrow") {
          const line = shapeRef as fabric.Line;
          line.set({ x2: pointer.x, y2: pointer.y });
        } else if (activeShape === "triangle") {
          const tri = shapeRef as fabric.Triangle;
          tri.set({
            width: Math.abs(pointer.x - originX),
            height: Math.abs(pointer.y - originY),
          });
          if (pointer.x < originX) tri.set({ left: pointer.x });
          if (pointer.y < originY) tri.set({ top: pointer.y });
        }
        canvas.requestRenderAll();
      }
    };

    const onMouseUp = () => {
      if (activeTool === "hand") {
        canvas.setCursor("grab");
      } else if (activeTool === "shapes" && shapeRef) {
        shapeRef.setCoords();
        canvas.fire("object:modified", { target: shapeRef });
        setActiveTool("select");
      }
      isDragging = false;
      shapeRef = null;
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    return () => {
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
    };
  }, [canvas, activeTool, activeShape, brushSettings, setActiveTool]);
}
