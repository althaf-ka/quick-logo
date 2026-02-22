import { useRef, useCallback } from "react";
import { Button } from "@quicklogo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import {
  SparkleIcon,
  GearIcon,
  LightningIcon,
  ArrowUpIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  credits?: number;
  showMagicPrompt?: boolean;
  magicPrompt?: boolean;
  onMagicPromptChange?: (value: boolean) => void;
  showConfigTrigger?: boolean;
  onConfigTrigger?: () => void;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Describe your ideal logo...",
  credits,
  showMagicPrompt = false,
  magicPrompt = false,
  onMagicPromptChange,
  showConfigTrigger = false,
  onConfigTrigger,
  className,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  const canSubmit = value.trim().length > 0 && !isLoading;

  return (
    <div className={cn("shrink-0 px-4 pb-3 pt-2", className)}>
      <div className="mx-auto max-w-2xl">
        <div className="border bg-card transition-colors focus-within:border-primary/25">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            disabled={isLoading}
            className="block w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 [transition:height_150ms_ease] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
            style={{ minHeight: "52px", maxHeight: "160px", overflow: "auto" }}
          />

          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              {showMagicPrompt && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          "flex size-7 cursor-pointer items-center justify-center transition-colors",
                          magicPrompt
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                        onClick={() => onMagicPromptChange?.(!magicPrompt)}
                      />
                    }
                  >
                    <SparkleIcon weight={magicPrompt ? "fill" : "regular"} className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {magicPrompt ? "Magic Prompt: On" : "Magic Prompt: Off"}
                  </TooltipContent>
                </Tooltip>
              )}

              {showConfigTrigger && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                        onClick={onConfigTrigger}
                      />
                    }
                  >
                    <GearIcon weight="bold" className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Settings</TooltipContent>
                </Tooltip>
              )}

              {credits !== undefined && (
                <span className="ml-1 flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground/50">
                  <LightningIcon weight="fill" className="size-3 text-primary/60" />
                  {credits}
                </span>
              )}
            </div>

            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              size="icon-sm"
              className={cn(
                "size-7 cursor-pointer transition-all duration-150",
                canSubmit && "active:scale-95"
              )}
            >
              {isLoading ? (
                <span className="size-3.5 animate-spin border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <ArrowUpIcon weight="bold" className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
