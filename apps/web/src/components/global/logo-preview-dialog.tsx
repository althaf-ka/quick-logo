import { type GeneratedLogo } from "@/types/generate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@quicklogo/ui/components/dialog";
import { Button } from "@quicklogo/ui/components/button";
import { DownloadIcon, PencilIcon, FrameCornersIcon } from "@phosphor-icons/react";

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
} as const;

interface LogoPreviewDialogProps {
  logo: GeneratedLogo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (logo: GeneratedLogo) => void;
  onEditWithAI?: (logo: GeneratedLogo) => void;
  onOpenInCanvas?: (logo: GeneratedLogo) => void;
}

export function LogoPreviewDialog({
  logo,
  open,
  onOpenChange,
  onDownload,
  onEditWithAI,
  onOpenInCanvas,
}: LogoPreviewDialogProps) {
  if (!logo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription className="truncate">
            {logo.prompt}
          </DialogDescription>
        </DialogHeader>

        <div
          className="relative mx-auto aspect-square w-full max-w-[400px]"
          style={CHECKER_BG}
        >
          <img
            src={logo.url}
            alt={logo.prompt}
            className="size-full object-contain p-6"
          />
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <div className="flex gap-2">
            {onEditWithAI && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => onEditWithAI(logo)}
              >
                <PencilIcon weight="bold" className="size-3.5" />
                Edit with AI
              </Button>
            )}
            {onOpenInCanvas && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => onOpenInCanvas(logo)}
              >
                <FrameCornersIcon weight="bold" className="size-3.5" />
                Canvas
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onDownload && (
              <Button
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => onDownload(logo)}
              >
                <DownloadIcon weight="bold" className="size-3.5" />
                Download
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
