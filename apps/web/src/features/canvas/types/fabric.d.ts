import "fabric";

declare module "fabric" {
  export interface Canvas {
    __isHistoryChanging?: boolean;
  }

  export interface Object {
    id?: string;
    name?: string;
    locked?: boolean;
    isAiSketch?: boolean;
    isEditing?: boolean;
  }
}
