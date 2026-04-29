import { useRef, useCallback } from "react";
import type { ModelOption, ModelContext } from "@quicklogo/ai-providers/models";
import { Button } from "@quicklogo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { ModelSelector } from "@/components/ui/model-selector/model-selector";
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
  size?: "default" | "compact";
  showMagicPrompt?: boolean;
  magicPrompt?: boolean;
  onMagicPromptChange?: (value: boolean) => void;
  showConfigTrigger?: boolean;
  onConfigTrigger?: () => void;
  configIcon?: React.ReactNode;
  showModelSelector?: boolean;
  models?: ModelOption[];
  modelValue?: string;
  onModelChange?: (value: string) => void;
  /** Which context determines the recommended badge in the model selector */
  modelContext?: ModelContext;
  brandName?: string;
  onBrandNameChange?: (value: string) => void;
  className?: string;
  contextPrompt?: string;
}


export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Describe your ideal logo...",
  credits,
  size = "default",
  showMagicPrompt = false,
  magicPrompt = false,
  onMagicPromptChange,
  showConfigTrigger = false,
  onConfigTrigger,
  configIcon,
  showModelSelector = false,
  models = [],
  modelValue,
  onModelChange,
  brandName,
  onBrandNameChange,
  className,
  contextPrompt,
  modelContext = "generate",
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCompact = size === "compact";

  const maxHeight = isCompact ? 100 : 160;
  const minHeight = isCompact ? 36 : 52;
  const rows = isCompact ? 1 : 2;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  const canSubmit = value.trim().length > 0 && !isLoading;


  return (
    <div className={cn("shrink-0 px-4 pt-2 pb-3", className)}>
      <div className="mx-auto max-w-2xl">
        <div 
          className="border-input bg-card focus-within:border-primary/25 flex flex-col border rounded-none overflow-hidden shadow-sm transition-colors"
          title={contextPrompt}
        >
          {onBrandNameChange && !isCompact && (
            <div className="flex items-center px-3 h-10 gap-3 bg-muted/5 border-b border-border/40 transition-colors focus-within:bg-muted/10">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 select-none">
                  Brand:
                </span>
                <div className="h-4 w-px bg-border" />
              </div>
              <input
                type="text"
                value={brandName || ""}
                onChange={(e) => onBrandNameChange(e.target.value)}
                maxLength={50}
                className="bg-transparent text-sm text-foreground w-full outline-none flex-1 h-full"
                disabled={isLoading}
              />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            disabled={isLoading}
            className={cn(
              "scrollbar-subtle text-foreground placeholder:text-muted-foreground/50 block w-full resize-none bg-transparent text-sm [transition:height_150ms_ease] focus:outline-none disabled:opacity-50",
              isCompact ? "px-3 py-2" : "px-3 pt-3 pb-1",
            )}
            style={{
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              overflow: "auto",
            }}
          />

          <div
            className={cn(
              "flex items-center justify-between px-3 pt-2 border-t border-border/20",
              isCompact ? "pb-1.5" : "pb-2",
            )}
          >
            <div className="flex items-center gap-0.5">
              {showModelSelector && models.length > 0 && (
                <div className="flex items-center">
                  <ModelSelector
                    variant="minimal"
                    models={models}
                    value={modelValue || ""}
                    onChange={(val: string) => {
                      if (val) onModelChange?.(val);
                    }}
                    context={modelContext}
                  />
                </div>
              )}

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
                            : "text-muted-foreground/50 hover:text-muted-foreground",
                        )}
                        onClick={() => onMagicPromptChange?.(!magicPrompt)}
                      />
                    }
                  >
                    <SparkleIcon
                      weight={magicPrompt ? "fill" : "regular"}
                      className="size-4"
                    />
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
                        className="text-muted-foreground/50 hover:text-muted-foreground flex size-7 cursor-pointer items-center justify-center transition-colors"
                        onClick={onConfigTrigger}
                      />
                    }
                  >
                    {configIcon || (
                      <GearIcon weight="bold" className="size-4" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top">Settings</TooltipContent>
                </Tooltip>
              )}

              {credits !== undefined && !showModelSelector && (
                <div className="ml-1 flex items-center justify-center px-1.5 py-1">
                  <span className="text-muted-foreground/50 flex items-center gap-1 text-[11px] font-medium tabular-nums">
                    <LightningIcon
                      weight="fill"
                      className="text-primary/60 size-3"
                    />
                    {credits}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {modelValue && models.find((m) => m.id === modelValue) && (
                <div className="text-primary flex items-center gap-1 text-[11px] font-bold tabular-nums tracking-tight">
                  <LightningIcon
                    weight="fill"
                    className="size-3.5"
                  />
                  {models.find((m) => m.id === modelValue)?.credits}
                </div>
              )}
              <Button
                onClick={onSubmit}
                disabled={!canSubmit}
                size="icon-sm"
                className={cn(
                  "size-7 cursor-pointer transition-all duration-150",
                  canSubmit && "active:scale-95 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20",
                )}
              >
                {isLoading ? (
                  <span className="border-primary-foreground/30 border-t-primary-foreground size-3.5 animate-spin border-2" />
                ) : (
                  <ArrowUpIcon weight="bold" className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
