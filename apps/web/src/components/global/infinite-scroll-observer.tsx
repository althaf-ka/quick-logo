import { InView } from "react-intersection-observer";
import { SpinnerGapIcon } from "@phosphor-icons/react";

interface InfiniteScrollObserverProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasItems: boolean;
}

export function InfiniteScrollObserver({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  hasItems,
}: InfiniteScrollObserverProps) {
  return (
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
      ) : !hasNextPage && hasItems ? (
        <div className="flex items-center gap-3">
          <div className="bg-border/40 h-px w-6" />
          <span className="text-muted-foreground/30 font-mono text-[9px] tracking-widest uppercase">
            End of collection
          </span>
          <div className="bg-border/40 h-px w-6" />
        </div>
      ) : null}
    </InView>
  );
}
