import { memo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@quicklogo/ui/lib/utils";
import {
  SpinnerGapIcon,
  WarningIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import type { InferResponseType } from "@quicklogo/api-client";
import { api } from "@/lib/api";
import { formatGenerationError } from "@/lib/format-error";

export type ProjectItem = InferResponseType<
  (typeof api.projects.index)["$get"],
  200
>["items"][number];

interface ProjectCardProps {
  project: ProjectItem;
  onClick: (project: ProjectItem) => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  onClick,
}: ProjectCardProps) {
  const isGenerating = project.status === "generating";
  const isFailed = project.status === "failed";

  const [now] = useState(() => Date.now());
  const daysLeft = Math.ceil(
    (new Date(project.expiresAt).getTime() - now) / 86_400_000,
  );
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 3 && !isExpired;
  const isWarning = daysLeft <= 7 && !isExpired;

  return (
    <button
      type="button"
      disabled={isGenerating}
      onClick={() => onClick(project)}
      className={cn(
        "group relative w-full overflow-hidden text-left outline-none",
        "border-border/50 bg-card border",
        "transition-all duration-200 ease-out",
        "hover:border-border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none",
      )}
    >
      <div className="bg-muted/20 relative aspect-square w-full overflow-hidden">
        {project.latestThumbnail ? (
          <img
            src={project.latestThumbnail}
            alt="Project thumbnail"
            className={cn(
              "size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
              isGenerating && "blur-sm grayscale",
              isFailed && "opacity-50 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {!isFailed && (
              <SpinnerGapIcon className="text-muted-foreground/20 size-6 animate-spin" />
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20" />

        {isGenerating ? (
          <div className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-2.5 backdrop-blur-[3px]">
            <div className="relative">
              <SpinnerGapIcon className="text-primary size-7 animate-spin" />
              <div className="bg-primary/15 absolute inset-0 animate-ping rounded-full" />
            </div>
            <span className="text-primary font-mono text-[9px] font-black tracking-[0.25em] uppercase">
              Generating
            </span>
          </div>
        ) : isFailed ? (
          <div className="bg-destructive/10 absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-4 text-center backdrop-blur-[2px]">
            <WarningIcon className="text-destructive size-7" weight="duotone" />
            <span className="text-destructive font-mono text-[9px] font-black tracking-[0.1em] uppercase">
              Failed
            </span>
            {project.errorMessage ? (
              <span className="text-destructive/80 mt-1 line-clamp-3 text-[10px] leading-tight">
                {formatGenerationError(project.errorMessage)}
              </span>
            ) : null}
          </div>
        ) : null}

        {!isGenerating && !isFailed ? (
          <div className="absolute top-2.5 right-2.5">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1",
                "font-mono text-[9px] font-black tracking-widest uppercase backdrop-blur-md",
                isExpired
                  ? "bg-red-500/90 text-white"
                  : isExpiringSoon
                    ? "animate-pulse bg-amber-500/90 text-white"
                    : isWarning
                      ? "bg-black/60 text-amber-400"
                      : "bg-black/50 text-white/80",
              )}
            >
              {isWarning && !isExpiringSoon ? (
                <WarningIcon weight="bold" className="size-2.5 shrink-0" />
              ) : null}
              {isExpired ? "Expired" : `${daysLeft}d`}
            </div>
          </div>
        ) : null}

        {!isGenerating ? (
          <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="border-foreground/20 bg-background/80 border p-1.5 backdrop-blur-sm">
              <ArrowRightIcon className="text-foreground size-3.5" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-border/60 border-t px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
            {formatDistanceToNow(new Date(project.createdAt), {
              addSuffix: true,
            })}
          </span>
          <span className="text-muted-foreground/40 font-mono text-[9px] uppercase">
            {project.id.slice(0, 6)}
          </span>
        </div>
      </div>
    </button>
  );
});
