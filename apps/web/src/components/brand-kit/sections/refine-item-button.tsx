import { Button } from "@quicklogo/ui/components/button";
import { SparkleIcon } from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

interface RefineItemButtonProps {
  isTargeted: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
  className?: string;
}

export function RefineItemButton({
  isTargeted,
  isDisabled,
  onToggle,
  className,
}: RefineItemButtonProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={isDisabled}
        className={cn(
          "group/btn h-7 flex items-center justify-center gap-0 overflow-hidden px-1.5 transition-all duration-500 ease-out",
          isTargeted
            ? "px-2.5 gap-1.5 border-primary text-primary bg-primary/10"
            : "hover:px-2.5 hover:gap-1.5 hover:border-primary/50",
          isDisabled && "opacity-50 cursor-not-allowed hover:px-1.5 hover:gap-0"
        )}
        onClick={onToggle}
      >
        <SparkleIcon className="size-3.5 shrink-0" />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap font-mono text-[9px] font-bold uppercase transition-all duration-500 ease-out",
            isTargeted
              ? "max-w-[50px] opacity-100"
              : "max-w-0 opacity-0 group-hover/btn:max-w-[50px] group-hover/btn:opacity-100",
            isDisabled && "group-hover/btn:max-w-0 group-hover/btn:opacity-0"
          )}
        >
          {isTargeted ? "Cancel" : "Refine"}
        </span>
      </Button>
    </div>
  );
}
