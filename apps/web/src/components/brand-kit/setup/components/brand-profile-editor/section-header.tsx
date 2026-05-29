import { CheckCircleIcon } from "@phosphor-icons/react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  isRequired?: boolean;
  hasData?: boolean;
  requiredText?: string;
}

export function SectionHeader({
  title,
  description,
  isRequired,
  hasData,
  requiredText,
}: SectionHeaderProps) {
  const showRedStar = isRequired && !hasData;
  const showConfigured = hasData;

  return (
    <div>
      <h3 className="text-foreground/50 flex items-center text-[10px] font-bold tracking-widest uppercase">
        {title}
        {showRedStar && <span className="ml-1 text-red-500">*</span>}
        {showConfigured && (
          <span className="ml-2 inline-flex items-center gap-1 font-mono text-[8px] font-medium tracking-normal text-emerald-500 normal-case">
            <CheckCircleIcon weight="fill" className="size-3" />
            Configured
          </span>
        )}
      </h3>
      {showRedStar && requiredText && (
        <p className="mt-1 font-mono text-[9px] tracking-wider text-red-500/80 uppercase">
          {requiredText}
        </p>
      )}
      {description && (
        <p className="text-muted-foreground/40 mt-1.5 text-[10px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
