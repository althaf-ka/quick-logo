import type { GenerateConfig } from "@/types/generate";
import { GenerationSidebar } from "./generation-sidebar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@quicklogo/ui/components/drawer";

interface MobileControlsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: GenerateConfig;
  onConfigChange: <K extends keyof GenerateConfig>(
    key: K,
    value: GenerateConfig[K]
  ) => void;
  onReferenceImageChange?: (file: File | null) => void;
}

export function MobileControlsSheet({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onReferenceImageChange,
}: MobileControlsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Generation Settings</DrawerTitle>
          <DrawerDescription>
            Configure your logo generation options
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-0 pb-6">
          <GenerationSidebar
            config={config}
            onConfigChange={onConfigChange}
            onReferenceImageChange={onReferenceImageChange}
            className="w-full border-0"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
