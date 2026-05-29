import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { InfiniteScrollObserver } from "@/components/global/infinite-scroll-observer";
import {
  PageEmptyState,
  PageErrorState,
} from "@/components/global/page-states";
import { api } from "@/lib/api";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectPreviewDialog } from "@/components/projects/project-preview-dialog";
import { downloadImage } from "@/lib/download";
import { FolderOpenIcon } from "@phosphor-icons/react";
import type { InferResponseType } from "@quicklogo/api-client";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "My Projects | QuickLogo" },
      { name: "description", content: "View and manage your generated logos." },
    ],
  }),
});

type ProjectItem = InferResponseType<
  typeof api.projects.index.$get,
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
        <PageErrorState />
      ) : projects.length === 0 ? (
        <PageEmptyState
          icon={
            <FolderOpenIcon
              weight="duotone"
              className="text-muted-foreground/40 size-10"
            />
          }
          title="No projects yet"
          description="Generate your first logo to see it here"
        />
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

          <InfiniteScrollObserver
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            hasItems={projects.length > 0}
          />
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
        onOpenBrandKit={(p) => {
          if (!p.latestImageId) return;
          setDialogOpen(false);
          navigate({
            to: "/brand-kit/create",
            search: { imageId: p.latestImageId },
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
