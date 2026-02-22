import type { GeneratedLogo } from "@/types/generate";
import { cn } from "@quicklogo/ui/lib/utils";

const CHECKER_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
} as const;

interface LogoCardProps {
  logo: GeneratedLogo;
  onClick?: (logo: GeneratedLogo) => void;
  className?: string;
}

export function LogoCard({ logo, onClick, className }: LogoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(logo)}
      className={cn(
        "group/card relative cursor-pointer overflow-hidden border ring-0 transition-all duration-300 ease-out",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "active:scale-[0.98]",
        className
      )}
    >
      <div className="relative aspect-square w-full" style={CHECKER_STYLE}>
        <img
          src={logo.url}
          alt={logo.prompt}
          className="size-full object-contain p-4 transition-transform duration-300 ease-out group-hover/card:scale-[1.03]"
          loading="lazy"
        />
      </div>
    </button>
  );
}
