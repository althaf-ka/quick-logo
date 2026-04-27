import { useRef, useCallback } from "react";
import { Button } from "@quicklogo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@quicklogo/ui/components/combobox";
import {
  SparkleIcon,
  GearIcon,
  LightningIcon,
  ArrowUpIcon,
  BrainIcon,
  CrownIcon,
  ShuffleIcon,
  CpuIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

interface ModelItem {
  id: string;
  name: string;
  credits: number;
  icon?: "lightning" | "brain" | "crown" | "shuffle" | string;
}

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
  models?: ModelItem[];
  modelValue?: string;
  onModelChange?: (value: string) => void;
  brandName?: string;
  onBrandNameChange?: (value: string) => void;
  className?: string;
}

function ModelIcon({ icon, className }: { icon?: string; className?: string }) {
  switch (icon) {
    case "lightning":
      return <LightningIcon weight="fill" className={className} />;
    case "brain":
      return <BrainIcon weight="fill" className={className} />;
    case "crown":
      return <CrownIcon weight="fill" className={className} />;
    case "shuffle":
      return <ShuffleIcon weight="fill" className={className} />;
    default:
      return <CpuIcon weight="fill" className={className} />;
  }
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

  const activeModel = models.find((m) => m.id === modelValue);

  return (
    <div className={cn("shrink-0 px-4 pt-2 pb-3", className)}>
      <div className="mx-auto max-w-2xl">
        <div className="border-input bg-card focus-within:border-primary/25 flex flex-col border rounded-none overflow-hidden shadow-sm transition-colors">
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
                <Combobox
                  value={modelValue}
                  onValueChange={(val) => {
                    if (val) onModelChange?.(val);
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div className="text-muted-foreground hover:text-foreground group relative flex h-7 w-auto max-w-56 cursor-pointer items-center gap-1.5 border-none! bg-transparent px-1 text-xs font-medium shadow-none! ring-0 transition-colors outline-none! focus-within:bg-transparent! focus-within:ring-0! hover:bg-transparent!">
                          <ModelIcon
                            icon={activeModel?.icon}
                            className="text-primary size-4 shrink-0"
                          />
                          <span className="pointer-events-none min-w-0 truncate whitespace-nowrap capitalize">
                            {activeModel?.name || "Model"}
                          </span>
                          <ComboboxInput
                            showTrigger={false}
                            className="absolute inset-0 h-full w-full cursor-pointer border-none! bg-transparent! opacity-0 shadow-none! ring-0! outline-none! [&_input]:absolute [&_input]:inset-0 [&_input]:h-full [&_input]:w-full [&_input]:cursor-pointer [&_input]:caret-transparent"
                          />
                        </div>
                      }
                    />
                    <TooltipContent side="top">AI Model</TooltipContent>
                  </Tooltip>

                  <ComboboxContent
                    align="start"
                    side="top"
                    sideOffset={8}
                    className="w-60 sm:w-[260px]"
                  >
                    <ComboboxList>
                      {models.map((m) => (
                        <ComboboxItem
                          key={m.id}
                          value={m.id}
                          className="py-2.5!"
                        >
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium capitalize">
                              <ModelIcon
                                icon={m.icon}
                                className="text-muted-foreground size-4 shrink-0"
                              />
                              <span className="truncate whitespace-nowrap">
                                {m.name}
                              </span>
                            </span>
                            <span className="bg-primary/10 text-primary flex shrink-0 items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                              <LightningIcon
                                weight="fill"
                                className="size-2.5"
                              />
                              {m.credits}
                            </span>
                          </div>
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
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

            <div className="flex items-center gap-2">
              {credits !== undefined && showModelSelector && (
                <span className="text-muted-foreground/50 flex items-center gap-1 text-[11px] font-medium tabular-nums">
                  <LightningIcon
                    weight="fill"
                    className="text-primary/60 size-3"
                  />
                  {credits}
                </span>
              )}

              <Button
                onClick={onSubmit}
                disabled={!canSubmit}
                size="icon-sm"
                className={cn(
                  "size-7 cursor-pointer transition-all duration-150",
                  canSubmit && "active:scale-95",
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
