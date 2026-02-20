import { cn } from "../lib/utils";

export function LogoLoader({ className }: { className?: string }) {
  const brandName = "QuickLogo".split("");

  return (
    <div
      className={cn(
        "bg-background fixed inset-0 z-100 flex flex-col items-center justify-center",
        className,
      )}
    >
      <h1 className="text-foreground flex text-2xl font-bold tracking-tight">
        {brandName.map((char, index) => (
          <span
            key={index}
            className="animate-wave inline-block"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {char}
          </span>
        ))}
      </h1>

      <div className="bg-muted mt-4 h-0.5 w-24 overflow-hidden rounded-full">
        <div className="bg-primary animate-progress h-full w-full rounded-full" />
      </div>
    </div>
  );
}
