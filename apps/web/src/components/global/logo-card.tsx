import type { GeneratedLogo } from "@/types/generate";
import { cn } from "@quicklogo/ui/lib/utils";
import { Button } from "@quicklogo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import {
  SparkleIcon,
  PaintBrushIcon,
  DownloadIcon,
} from "@phosphor-icons/react";

const CHECKER_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
} as const;

interface LogoCardProps {
  logo: GeneratedLogo;
  onClick?: (logo: GeneratedLogo) => void;
  onDownload?: (logo: GeneratedLogo) => void;
  onEditWithAI?: (logo: GeneratedLogo) => void;
  onOpenInCanvas?: (logo: GeneratedLogo) => void;
  className?: string;
}

export function LogoCard({
  logo,
  onClick,
  onDownload,
  onEditWithAI,
  onOpenInCanvas,
  className,
}: LogoCardProps) {
  return (
    <div
      className={cn(
        "group/card relative overflow-hidden border ring-0 transition-all duration-300 ease-out",
        "hover:border-primary/50 hover:shadow-primary/5 hover:shadow-lg",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onClick?.(logo)}
        className="focus-visible:ring-primary/40 absolute inset-0 z-0 cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
        aria-label="View Logo"
      />
      <div
        className="pointer-events-none relative aspect-square w-full"
        style={CHECKER_STYLE}
      >
        <img
          src={logo.url}
          alt={logo.prompt}
          className="size-full object-contain p-2 transition-transform duration-300 ease-out group-hover/card:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1.5 opacity-100 transition-opacity duration-200 group-hover/card:opacity-100 md:opacity-40">
        {onEditWithAI ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 cursor-pointer rounded-none shadow-sm transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWithAI(logo);
                  }}
                />
              }
            >
              <SparkleIcon weight="fill" className="text-primary size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Edit with AI</TooltipContent>
          </Tooltip>
        ) : null}

        {onOpenInCanvas ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 cursor-pointer rounded-none shadow-sm transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenInCanvas(logo);
                  }}
                />
              }
            >
              <PaintBrushIcon weight="fill" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Open in Canvas</TooltipContent>
          </Tooltip>
        ) : null}

        {onDownload ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 cursor-pointer rounded-none shadow-sm transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(logo);
                  }}
                />
              }
            >
              <DownloadIcon weight="bold" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Download</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
