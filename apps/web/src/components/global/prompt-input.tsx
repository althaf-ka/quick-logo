import { useRef, useCallback, useState, useEffect } from "react";
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
  XIcon,
  CrosshairIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
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
  allowEmptySubmit?: boolean;
  /** Shows a targeting context badge above the input. Only used by brand-kit. */
  targetContext?: string;
  /** Called when user dismisses the targeting badge. */
  onClearTarget?: () => void;
  submitDisabled?: boolean;
  validationError?: string;
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
  targetContext,
  onClearTarget,
  allowEmptySubmit = false,
  submitDisabled = false,
  validationError,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCompact = size === "compact";

  const maxHeight = isCompact ? 100 : 140;
  const minHeight = isCompact ? 36 : 56;
  const rows = isCompact ? 1 : 2;

  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (newVal: string) => {
      setLocalValue(newVal);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange(newVal);
      }, 400);
    },
    [onChange],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = localValue.trim();
    if (!isLoading && (allowEmptySubmit || trimmed.length > 0)) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onChange(localValue);
      onSubmit(localValue);
    }
  }, [localValue, isLoading, allowEmptySubmit, onChange, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const canSubmit =
    !isLoading &&
    !submitDisabled &&
    (allowEmptySubmit || localValue.trim().length > 0);

  return (
    <div className={cn("shrink-0 px-4 pt-2 pb-3", className)}>
      <div className="mx-auto w-full max-w-3xl">
        <div
          className="border-input bg-card focus-within:border-primary/25 flex flex-col overflow-hidden rounded-none border shadow-sm transition-colors"
          title={contextPrompt}
        >
          {validationError ? (
            <div className="border-border/20 flex items-center gap-2 border-b bg-yellow-500/10 px-3 py-1.5">
              <WarningCircleIcon
                weight="bold"
                className="size-3 text-yellow-500"
              />
              <span className="font-mono text-[10px] font-bold tracking-wider text-yellow-500 uppercase">
                {validationError}
              </span>
              {onClearTarget ? (
                <button
                  onClick={onClearTarget}
                  className="text-muted-foreground/50 hover:text-foreground ml-auto cursor-pointer transition-colors"
                >
                  <XIcon weight="bold" className="size-3" />
                </button>
              ) : null}
            </div>
          ) : targetContext ? (
            <div className="bg-primary/5 border-border/20 flex items-center gap-2 border-b px-3 py-1.5">
              <CrosshairIcon weight="bold" className="text-primary size-3" />
              <span className="text-primary font-mono text-[10px] font-bold tracking-wider uppercase">
                Refining: {targetContext}
              </span>
              {onClearTarget ? (
                <button
                  onClick={onClearTarget}
                  className="text-muted-foreground/50 hover:text-foreground ml-auto cursor-pointer transition-colors"
                >
                  <XIcon weight="bold" className="size-3" />
                </button>
              ) : null}
            </div>
          ) : null}

          {onBrandNameChange && !isCompact && !targetContext ? (
            <div className="bg-muted/5 border-border/40 focus-within:bg-muted/10 flex h-10 items-center gap-3 border-b px-3 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-muted-foreground/50 text-[10px] font-bold tracking-wider uppercase select-none">
                  Brand Name:
                </span>
                <div className="bg-border h-4 w-px" />
              </div>
              <input
                type="text"
                value={brandName || ""}
                onChange={(e) => onBrandNameChange(e.target.value)}
                maxLength={50}
                className="text-foreground h-full w-full flex-1 bg-transparent text-sm outline-none"
                disabled={isLoading}
              />
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
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
              "border-border/20 flex items-center justify-between border-t px-3 pt-2",
              isCompact ? "pb-1.5" : "pb-2",
            )}
          >
            <div className="flex items-center gap-0.5">
              {showModelSelector && models.length > 0 ? (
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
              ) : null}

              {showMagicPrompt ? (
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
              ) : null}

              {showConfigTrigger ? (
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
              ) : null}
            </div>

            <div className="flex items-center gap-2.5">
              {modelValue && models.find((m) => m.id === modelValue) ? (
                <div className="text-primary flex items-center gap-1 text-[11px] font-bold tracking-tight tabular-nums">
                  <LightningIcon weight="fill" className="size-3.5" />
                  {models.find((m) => m.id === modelValue)?.credits}
                </div>
              ) : null}
              {credits !== undefined && !showModelSelector ? (
                <div className="text-primary flex items-center gap-1 text-[11px] font-bold tracking-tight tabular-nums">
                  <LightningIcon weight="fill" className="size-3.5" />
                  {credits}
                </div>
              ) : null}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="icon-sm"
                className={cn(
                  "size-7 cursor-pointer transition-all duration-150",
                  canSubmit &&
                    "bg-primary hover:bg-primary/90 shadow-primary/20 shadow-lg active:scale-95",
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
