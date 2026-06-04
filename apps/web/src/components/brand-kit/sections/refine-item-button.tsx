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
          "group/btn flex h-7 items-center justify-center gap-0 overflow-hidden px-1.5 transition-all duration-500 ease-out",
          isTargeted
            ? "border-primary text-primary bg-primary/10 gap-1.5 px-2.5"
            : "hover:border-primary/50 hover:gap-1.5 hover:px-2.5",
          isDisabled &&
            "cursor-not-allowed opacity-50 hover:gap-0 hover:px-1.5",
        )}
        onClick={onToggle}
      >
        <SparkleIcon className="size-3.5 shrink-0" />
        <span
          className={cn(
            "overflow-hidden font-mono text-[9px] font-bold whitespace-nowrap uppercase transition-all duration-500 ease-out",
            isTargeted
              ? "max-w-[50px] opacity-100"
              : "max-w-0 opacity-0 group-hover/btn:max-w-[50px] group-hover/btn:opacity-100",
            isDisabled && "group-hover/btn:max-w-0 group-hover/btn:opacity-0",
          )}
        >
          {isTargeted ? "Cancel" : "Refine"}
        </span>
      </Button>
    </div>
  );
}
