import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { cn } from "@quicklogo/ui/lib/utils";

export interface ToolButtonProps {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ToolButton({
  icon: Icon,
  label,
  shortcut,
  isActive,
  onClick,
  disabled,
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex size-10 items-center justify-center rounded-none border border-transparent transition-colors",
          "cursor-pointer text-zinc-400 hover:bg-white/5",
          isActive && "bg-primary/10 text-primary border-primary/20",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
        )}
      >
        <Icon weight={isActive ? "fill" : "regular"} className="size-5" />
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase"
      >
        {label} {shortcut && <span className="text-zinc-500">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
