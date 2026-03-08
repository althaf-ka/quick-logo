import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { InView } from "react-intersection-observer";
import { api } from "@/lib/api";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectPreviewDialog } from "@/components/projects/project-preview-dialog";
import { downloadImage } from "@/lib/download";
import { SpinnerGapIcon, FolderOpenIcon } from "@phosphor-icons/react";
import type { InferResponseType } from "@quicklogo/api-client";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

type ProjectItem = InferResponseType<
  (typeof api.projects.index)["$get"],
  200
>["items"][number];

function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["projects"],
      queryFn: async ({ pageParam }) => {
        const res = await api.projects.index.$get({
          query: {
            cursor: (pageParam as string) || undefined,
            limit: "16",
          },
        });
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
      },
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor,
    });

  const projects = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const handleClick = (project: ProjectItem) => {
    setSelected(project);
    setDialogOpen(true);
  };

  const handleDeleted = (projectId: string) => {
    queryClient.setQueryData(["projects"], (old: typeof data) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((p) => p.id !== projectId),
        })),
      };
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-mono text-xl font-black tracking-tight">
          My Projects
        </h1>
        <p className="text-muted-foreground/60 mt-1 font-mono text-[11px] tracking-wide">
          {status === "success" && projects.length > 0
            ? `${projects.length} project${projects.length !== 1 ? "s" : ""}`
            : "Your generated logos"}
          {" · stored for 30 days"}
        </p>
      </div>

      {status === "pending" ? (
        <LoadingGrid />
      ) : status === "error" ? (
        <ErrorState />
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={handleClick}
              />
            ))}
          </div>

          <InView
            as="div"
            className="mt-10 flex h-12 items-center justify-center"
            onChange={(inView) => {
              if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
          >
            {isFetchingNextPage ? (
              <span className="text-muted-foreground/40 flex items-center gap-2 font-mono text-[9px] font-black tracking-widest uppercase">
                <SpinnerGapIcon className="size-3.5 animate-spin" />
                Loading more
              </span>
            ) : !hasNextPage && projects.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="bg-border/40 h-px w-6" />
                <span className="text-muted-foreground/30 font-mono text-[9px] tracking-widest uppercase">
                  End of collection
                </span>
                <div className="bg-border/40 h-px w-6" />
              </div>
            ) : null}
          </InView>
        </>
      )}

      <ProjectPreviewDialog
        project={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDownload={(p) => {
          if (p.latestThumbnail) {
            downloadImage(p.latestThumbnail, `quicklogo-${p.id}.png`);
          }
        }}
        onEditWithAI={(p) => {
          if (!p.latestImageId) return;
          setDialogOpen(false);
          navigate({
            to: "/edit/$imageId",
            params: { imageId: p.latestImageId },
          });
        }}
        onOpenInCanvas={(p) => {
          if (!p.latestImageId) return;
          setDialogOpen(false);
          navigate({
            to: "/canvas/$imageId",
            params: { imageId: p.latestImageId },
          });
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/30 aspect-square w-full animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-border/40 flex min-h-[360px] flex-col items-center justify-center border border-dashed p-12 text-center">
      <FolderOpenIcon
        weight="duotone"
        className="text-muted-foreground/15 mb-4 size-10"
      />
      <p className="font-mono text-xs font-black tracking-widest uppercase">
        No projects yet
      </p>
      <p className="text-muted-foreground/40 mt-1.5 font-mono text-[10px] tracking-wide">
        Generate your first logo to see it here
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="border-destructive/20 bg-destructive/5 flex min-h-[360px] flex-col items-center justify-center border p-12 text-center">
      <p className="text-destructive font-mono text-xs font-black tracking-widest uppercase">
        Failed to load
      </p>
      <p className="text-muted-foreground/40 mt-1.5 font-mono text-[10px]">
        Refresh the page to try again
      </p>
    </div>
  );
}
