import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@quicklogo/ui/components/dialog";
import { Button } from "@quicklogo/ui/components/button";
import {
  DownloadIcon,
  PencilIcon,
  FrameCornersIcon,
  ClockIcon,
  SpinnerGapIcon,
  WarningIcon,
  LightningIcon,
  CheckIcon,
  TrashIcon,
  CaretUpIcon,
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
import { api } from "@/lib/api";
import { cn } from "@quicklogo/ui/lib/utils";
import { parseApiError } from "@/lib/api-error";

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
} as const;

const EXTEND_COST = 10;

interface Project {
  id: string;
  latestImageId: string | null;
  latestThumbnail: string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
  status: "generating" | "completed";
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
  const [storageOpen, setStorageOpen] = useState(false);
  const [extended, setExtended] = useState(false);
  const queryClient = useQueryClient();

  const [now] = useState(() => Date.now());

  const daysLeft = useMemo(
    () =>
      project
        ? Math.ceil((new Date(project.expiresAt).getTime() - now) / 86_400_000)
        : 0,
    [project, now],
  );

  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 3 && !isExpired;
  const isWarning = daysLeft <= 7 && !isExpired;

  const extendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.projects[":id"].extend.$post({
        param: { id: project!.id },
      });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return res.json();
    },
    onSuccess: () => {
      setExtended(true);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Storage extended by 30 days");
    },
    onError: (err: Error) => toast.error(err.message ?? "Extension failed"),
  });

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

  const newExpiry = addDays(new Date(project.expiresAt), 30);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v)
          setTimeout(() => {
            setStorageOpen(false);
            setExtended(false);
          }, 200);
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
            {project.latestThumbnail ? (
              <img
                src={project.latestThumbnail}
                alt="Project preview"
                className="size-full object-contain"
              />
            ) : (
              <SpinnerGapIcon className="text-muted-foreground/20 size-10 animate-spin" />
            )}
          </div>

          <div className="absolute top-3 left-3">
            <button
              type="button"
              onClick={() => setStorageOpen((v) => !v)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 px-3 py-2 backdrop-blur-md",
                "font-mono text-[10px] font-black tracking-widest uppercase",
                "border transition-all duration-200",
                isExpired
                  ? "border-red-500/40 bg-red-500/80 text-white hover:bg-red-500/90"
                  : isExpiringSoon
                    ? "animate-pulse border-amber-400/40 bg-amber-500/80 text-white"
                    : isWarning
                      ? "border-amber-400/30 bg-black/70 text-amber-400 hover:bg-black/80"
                      : "border-white/10 bg-black/60 text-white/80 hover:bg-black/75 hover:text-white",
                storageOpen && "ring-1 ring-white/20",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  isExpired
                    ? "bg-white/20"
                    : isWarning
                      ? "bg-amber-400/20"
                      : "bg-white/10",
                )}
              >
                {isWarning ? (
                  <WarningIcon weight="fill" className="size-2.5" />
                ) : (
                  <ClockIcon weight="bold" className="size-2.5" />
                )}
              </span>
              {isExpired ? "Expired" : `${daysLeft} days`}
              <span
                className={cn(
                  "ml-0.5 flex items-center gap-0.5 font-mono text-[8px] tracking-normal normal-case transition-colors",
                  isWarning ? "text-amber-300/60" : "text-white/30",
                  "group-hover:text-white/60",
                )}
              >
                storage
                <CaretUpIcon
                  weight="bold"
                  className={cn(
                    "size-2 transition-transform duration-300",
                    storageOpen ? "rotate-0" : "rotate-180",
                  )}
                />
              </span>
            </button>
          </div>

          {/* Created date — bottom left */}
          <div className="absolute bottom-3 left-3">
            <span className="font-mono text-[9px] font-black tracking-wider text-white/40 uppercase">
              {format(new Date(project.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            storageOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="border-border/50 border-b">
              <div className="space-y-3 p-4">
                <div
                  className={cn(
                    "flex items-center gap-2 border px-3 py-2.5",
                    isExpired
                      ? "border-destructive/30 bg-destructive/5"
                      : isWarning
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border/40 bg-muted/10",
                  )}
                >
                  <WarningIcon
                    weight="duotone"
                    className={cn(
                      "size-3 shrink-0",
                      isExpired
                        ? "text-destructive"
                        : isWarning
                          ? "text-amber-500"
                          : "text-muted-foreground/30",
                    )}
                  />
                  <p className="text-muted-foreground/60 font-mono text-[10px]">
                    {isExpired
                      ? "This project has expired and been removed."
                      : `Expires ${format(new Date(project.expiresAt), "MMM d, yyyy")} · ${daysLeft}d left`}
                  </p>
                </div>

                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border-border/40 border p-3">
                      <p className="text-muted-foreground/40 font-mono text-[9px] font-black tracking-widest uppercase">
                        Now
                      </p>
                      <p className="mt-1.5 font-mono text-sm font-black">
                        {format(new Date(project.expiresAt), "MMM d")}
                      </p>
                      <p className="text-muted-foreground/40 font-mono text-[9px]">
                        {format(new Date(project.expiresAt), "yyyy")}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "border p-3 transition-colors duration-300",
                        extended
                          ? "border-foreground/30 bg-foreground/5"
                          : "border-border/40 border-dashed",
                      )}
                    >
                      <p className="text-muted-foreground/40 font-mono text-[9px] font-black tracking-widest uppercase">
                        +30 days
                      </p>
                      <p className="mt-1.5 font-mono text-sm font-black">
                        {format(newExpiry, "MMM d")}
                      </p>
                      <p className="text-primary font-mono text-[9px]">
                        {format(newExpiry, "yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {!isExpired && (
                  <Button
                    className="h-9 w-full rounded-none font-mono text-[9px] font-black tracking-widest uppercase"
                    onClick={() => extendMutation.mutate()}
                    disabled={extendMutation.isPending || extended}
                    variant={extended ? "outline" : "default"}
                  >
                    {extendMutation.isPending ? (
                      <>
                        <SpinnerGapIcon className="size-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : extended ? (
                      <>
                        <CheckIcon weight="bold" className="size-3.5" />
                        Extended
                      </>
                    ) : (
                      <>
                        <LightningIcon weight="fill" className="size-3" />
                        Extend 30 days — {EXTEND_COST} credits
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

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
