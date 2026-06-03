import { cn } from "@quicklogo/ui/lib/utils";
import { RefineItemButton } from "./refine-item-button";
import React from "react";

interface AssetCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  isTargeted?: boolean;
  isPlaceholder?: boolean;
  onToggleRefine?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function AssetCard({
  title,
  subtitle,
  icon,
  isTargeted = false,
  isPlaceholder = false,
  onToggleRefine,
  className,
  children,
}: AssetCardProps) {
  return (
    <div
      className={cn(
        "group border-border/50 bg-card flex flex-col overflow-hidden border transition-colors",
        className
      )}
    >
      {/* The main content area where children (images, overlays) will be rendered */}
      {children}

      {/* Standardized Footer */}
      <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <div className="font-mono text-[9px] font-bold uppercase leading-none sm:text-[10px]">
              {title}
            </div>
            {subtitle && (
              <div className="text-muted-foreground mt-1 font-mono text-[9px] leading-none tracking-wider uppercase">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {onToggleRefine && (
          <RefineItemButton
            isTargeted={isTargeted}
            isDisabled={isPlaceholder}
            onToggle={onToggleRefine}
          />
        )}
      </div>
    </div>
  );
}
