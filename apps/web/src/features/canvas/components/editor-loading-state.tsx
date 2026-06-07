import { Spinner } from "@quicklogo/ui/components/spinner";

export function EditorLoadingState() {
  return (
    <div className="bg-background flex h-full min-h-0 w-full flex-col items-center justify-center gap-4">
      <Spinner className="size-8" />
      <p className="text-muted-foreground animate-pulse text-sm font-medium tracking-widest uppercase">
        Loading Editor Studio...
      </p>
    </div>
  );
}
