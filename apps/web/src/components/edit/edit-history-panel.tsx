import type { EditHistoryEntry } from "@/hooks/use-edit-form";
import { cn } from "@quicklogo/ui/lib/utils";
import { ImageIcon } from "@phosphor-icons/react";

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
} as const;

interface EditHistoryPanelProps {
  history: EditHistoryEntry[];
  selectedEntry: EditHistoryEntry | null;
  onSelectEntry: (entry: EditHistoryEntry | null) => void;
  isLocked?: boolean;
  className?: string;
}

export function EditHistoryPanel({
  history,
  selectedEntry,
  onSelectEntry,
  isLocked = false,
  className,
}: EditHistoryPanelProps) {
  const editCount = Math.max(0, history.length - 1);

  return (
    <aside className={cn("bg-card flex flex-col", className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold tracking-tight">Versions</span>
        {editCount > 0 && (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {editCount} edit{editCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-1 overflow-y-auto px-2 pb-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent">
        {history.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ImageIcon
              weight="thin"
              className="text-muted-foreground/20 size-8"
            />
            <p className="text-muted-foreground/40 text-[10px]">
              Edits appear here
            </p>
          </div>
        )}

        {history.map((entry, index) => (
          <HistoryCard
            key={entry.id}
            imageUrl={entry.url}
            label={entry.prompt}
            time={formatTime(entry.createdAt)}
            isActive={selectedEntry?.id === entry.id}
            isSource={index === history.length - 1} // The oldest item is visually the source
            isLocked={isLocked}
            onClick={() => onSelectEntry(entry)}
          />
        ))}
      </div>
    </aside>
  );
}

function HistoryCard({
  imageUrl,
  label,
  time,
  isActive,
  isSource,
  isLocked,
  onClick,
}: {
  imageUrl: string;
  label: string;
  time: string;
  isActive: boolean;
  isSource?: boolean;
  isLocked?: boolean;
  onClick: () => void;
}) {
  const shouldShowPromptTooltip =
    !isSource && label.trim().length > 0 && label.length <= 120;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-none px-2 py-2 text-left transition-all",
        isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        isActive
          ? "bg-primary/10 border-primary ring-primary/20 border ring-1"
          : "hover:bg-muted/40 border border-transparent",
      )}
      title={shouldShowPromptTooltip ? label : undefined}
    >
      <div className="size-10 shrink-0 overflow-hidden" style={CHECKER}>
        <img
          src={imageUrl}
          alt={label}
          className="size-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <div className="flex items-center gap-1.5">
          <p className="text-foreground flex-1 truncate text-[11px] leading-snug font-medium">
            {isSource ? "Original source" : label}
          </p>
          {isSource && (
            <span className="bg-primary/10 text-primary shrink-0 rounded px-1 py-0.5 text-[8px] font-bold tracking-wider uppercase">
              Source
            </span>
          )}
        </div>
        <span className="text-muted-foreground/50 text-[9px]">{time}</span>
      </div>
    </button>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
