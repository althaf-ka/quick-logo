import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@quicklogo/ui/components/dialog";
import {
  DownloadIcon,
  PencilIcon,
  FrameCornersIcon,
  SpinnerGapIcon,
  WarningIcon,
  TrashIcon,
  PaletteIcon,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@quicklogo/ui/components/alert-dialog";
import { toast } from "@quicklogo/ui/components/sonner";
import { api } from "@/lib/api-client";
import { cn } from "@quicklogo/ui/lib/utils";
import { parseApiError } from "@/lib/api-error";

import { formatGenerationError } from "@/lib/format-error";

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
} as const;

interface Project {
  id: string;
  latestImageId: string | null;
  latestThumbnail: string | null;
  createdAt: string | Date;
  status: "generating" | "completed" | "failed";
  errorMessage?: string | null;
}

interface ProjectPreviewDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (project: Project) => void;
  onEditWithAI?: (project: Project) => void;
  onOpenInCanvas?: (project: Project) => void;
  onOpenBrandKit?: (project: Project) => void;
  onDeleted?: (projectId: string) => void;
}

export function ProjectPreviewDialog({
  project,
  open,
  onOpenChange,
  onDownload,
  onEditWithAI,
  onOpenInCanvas,
  onOpenBrandKit,
  onDeleted,
}: ProjectPreviewDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.projects[":id"].$delete({
        param: { id: project!.id },
      });
      if (!res.ok) {
        throw await parseApiError(res);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      onDeleted?.(project!.id);
      toast.success("Project deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Delete failed"),
  });

  if (!project) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
      }}
    >
      <DialogContent className="border-border/60 bg-background gap-0 overflow-hidden border p-0 shadow-2xl sm:max-w-sm">
        <DialogTitle className="sr-only">Project Preview</DialogTitle>
        <DialogDescription className="sr-only">
          {project.id} — Created{" "}
          {format(new Date(project.createdAt), "MMM d, yyyy")}
        </DialogDescription>

        <div className="relative w-full" style={CHECKER_BG}>
          <div className="flex aspect-square w-full items-center justify-center">
            {project.status === "failed" ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <WarningIcon
                  className="text-destructive/80 size-12"
                  weight="duotone"
                />
                <p className="text-destructive font-mono text-sm font-black uppercase">
                  Generation Failed
                </p>
                {project.errorMessage && (
                  <p className="text-muted-foreground max-w-[85%] font-mono text-xs leading-relaxed">
                    {formatGenerationError(project.errorMessage)}
                  </p>
                )}
              </div>
            ) : project.latestThumbnail ? (
              <img
                src={project.latestThumbnail}
                alt="Project preview"
                className="size-full object-contain"
              />
            ) : (
              <SpinnerGapIcon className="text-muted-foreground/20 size-10 animate-spin" />
            )}
          </div>

          {/* Created date — bottom left */}
          <div className="absolute bottom-3 left-3">
            <span className="font-mono text-[9px] font-black tracking-wider text-white/40 uppercase">
              {format(new Date(project.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {project.status !== "failed" && (
          <div className="border-border/50 grid grid-cols-4 border-t">
            <ActionCell
              icon={<PencilIcon weight="bold" className="size-3.5" />}
              label="Edit with AI"
              disabled={!project.latestImageId}
              onClick={() => {
                onEditWithAI?.(project);
                onOpenChange(false);
              }}
              variant="primary"
            />
            <ActionCell
              icon={<FrameCornersIcon weight="bold" className="size-3.5" />}
              label="Canvas"
              disabled={!project.latestImageId}
              onClick={() => {
                onOpenInCanvas?.(project);
                onOpenChange(false);
              }}
              className="border-border/50 border-x"
            />
            <ActionCell
              icon={<DownloadIcon weight="bold" className="size-3.5" />}
              label="Download"
              onClick={() => onDownload?.(project)}
              className="border-border/50 border-x"
            />
            <ActionCell
              icon={<PaletteIcon weight="bold" className="size-3.5" />}
              label="Brand Kit"
              disabled={!project.latestImageId}
              onClick={() => {
                onOpenBrandKit?.(project);
                onOpenChange(false);
              }}
            />
          </div>
        )}

        <div className="border-border/50 flex items-center justify-end border-t px-4 py-2.5">
          <AlertDialog>
            <AlertDialogTrigger>
              <button
                type="button"
                className="text-muted-foreground/30 hover:text-destructive flex cursor-pointer items-center gap-1.5 font-mono text-[9px] font-black tracking-widest uppercase transition-colors"
              >
                <TrashIcon weight="bold" className="size-3" />
                Delete project
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border/60 bg-background border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono text-sm font-black tracking-widest uppercase">
                  Delete project?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-mono text-xs">
                  This will permanently delete all images in this project from
                  storage. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none font-mono text-[10px] font-black tracking-widest uppercase">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none font-mono text-[10px] font-black tracking-widest uppercase"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <SpinnerGapIcon className="size-4 animate-spin" />
                  ) : (
                    "Delete permanently"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionCell({
  icon,
  label,
  onClick,
  className,
  variant = "default",
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "primary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 py-4 transition-colors",
        "font-mono text-[9px] font-black tracking-widest uppercase",
        disabled
          ? "cursor-not-allowed opacity-30"
          : variant === "primary"
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
