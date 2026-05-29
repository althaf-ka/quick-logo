import { Link } from "@tanstack/react-router";
import {
  TextAaIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  WarningCircleIcon,
  HourglassIcon,
  ImageSquareIcon,
  BuildingsIcon,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";
import type { BrandKitItem } from "@/hooks/brand-kit/use-brand-kits";

interface BrandKitCardProps {
  kit: BrandKitItem;
}

export function BrandKitCard({ kit }: BrandKitCardProps) {
  const brandName = kit.brandName || "Untitled Brand";
  const typographyLabel =
    TYPOGRAPHY_REGISTRY[kit.typographyStyle]?.label ?? kit.typographyStyle;

  const colors = Array.isArray(kit.extractedColors) ? kit.extractedColors : [];
  const displayColors = colors.slice(0, 5); // Show up to 5 swatches

  const createdAt = kit.createdAt ? new Date(kit.createdAt) : null;
  const formattedDate =
    createdAt && !isNaN(createdAt.getTime())
      ? formatDistanceToNow(createdAt, { addSuffix: true })
      : "Unknown date";

  const customLogoUrl = kit.customLogoUrl as string | null;
  const industry = kit.industry || "General";

  return (
    <Link
      to="/brand-kit/$id"
      params={{ id: kit.id }}
      className="group focus-visible:ring-primary relative block flex flex-col justify-between border border-white/10 bg-zinc-950/40 transition-all duration-300 outline-none hover:border-white/30 hover:bg-zinc-950/80 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)] focus-visible:ring-2"
    >
      <div className="flex h-20 w-full border-b border-white/10">
        {displayColors.length > 0 ? (
          displayColors.map((color: unknown, idx: number) => (
            <div
              key={`${color}-${idx}`}
              className="flex-1 transition-all duration-500 group-hover:opacity-90"
              style={{
                backgroundColor: typeof color === "string" ? color : "#000",
              }}
            />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center bg-zinc-900">
            <span className="text-muted-foreground/40 font-mono text-[9px] tracking-widest uppercase">
              No Colors
            </span>
          </div>
        )}
      </div>

      <div className="relative px-6">
        <div className="absolute -top-10 left-6">
          {customLogoUrl ? (
            <div className="size-20 shrink-0 border-[3px] border-zinc-950 bg-black p-1.5 shadow-xl transition-transform duration-500 group-hover:scale-105">
              <img
                src={customLogoUrl}
                alt={brandName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center border-[3px] border-zinc-950 bg-zinc-900 shadow-xl transition-transform duration-500 group-hover:scale-105">
              <ImageSquareIcon
                weight="duotone"
                className="size-8 text-white/20"
              />
            </div>
          )}
        </div>
        <div className="absolute top-4 right-6">
          <StatusBadge status={kit.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-14 pb-5">
        <h3 className="line-clamp-2 font-mono text-xl leading-tight font-black tracking-widest text-white/90 uppercase transition-colors group-hover:text-white">
          {brandName}
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
          <div className="flex flex-col gap-1.5 border-l-2 border-white/10 pl-3 transition-colors group-hover:border-white/30">
            <div className="flex items-center gap-1.5">
              <TextAaIcon
                weight="duotone"
                className="text-muted-foreground/50 size-3.5"
              />
              <p className="text-muted-foreground/40 font-mono text-[8px] font-bold tracking-widest uppercase">
                Typography
              </p>
            </div>
            <span className="text-muted-foreground/90 line-clamp-1 font-mono text-[9px] font-bold tracking-widest uppercase">
              {typographyLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 border-l-2 border-white/10 pl-3 transition-colors group-hover:border-white/30">
            <div className="flex items-center gap-1.5">
              <BuildingsIcon
                weight="duotone"
                className="text-muted-foreground/50 size-3.5"
              />
              <p className="text-muted-foreground/40 font-mono text-[8px] font-bold tracking-widest uppercase">
                Industry
              </p>
            </div>
            <span className="text-muted-foreground/90 line-clamp-1 font-mono text-[9px] font-bold tracking-widest uppercase">
              {industry}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.01] px-6 py-3 transition-colors group-hover:bg-white/[0.03]">
        <span className="text-muted-foreground/40 font-mono text-[8px] tracking-widest uppercase">
          {formattedDate}
        </span>
        <div className="text-primary flex items-center gap-1 font-mono text-[8px] font-bold tracking-widest uppercase opacity-0 transition-all group-hover:opacity-100">
          Open <span className="mb-0.5 text-lg leading-none">→</span>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <span className="flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-emerald-500 uppercase">
          <CheckCircleIcon weight="fill" className="size-3" />
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="flex items-center gap-1.5 border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-blue-500 uppercase">
          <CircleNotchIcon weight="bold" className="size-3 animate-spin" />
          Generating
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1.5 border border-red-500/20 bg-red-500/10 px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-red-500 uppercase">
          <WarningCircleIcon weight="fill" className="size-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] font-bold tracking-widest uppercase">
          <HourglassIcon weight="duotone" className="size-3" />
          Pending
        </span>
      );
  }
}
