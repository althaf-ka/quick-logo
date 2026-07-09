import { useState } from "react";
import { cn } from "@quicklogo/ui/lib/utils";

export function FloatingInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  error,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  error?: boolean;
  inputClassName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="group relative">
      <label
        className={cn(
          "pointer-events-none absolute left-0 font-mono tracking-widest uppercase transition-all duration-300",
          isActive
            ? error
              ? "-top-5 text-[9px] font-bold text-red-500/80"
              : "text-primary/60 -top-5 text-[9px] font-bold"
            : error
              ? "top-3 text-[10px] font-semibold text-red-500/60"
              : "text-muted-foreground/30 top-3 text-[10px] font-semibold",
        )}
      >
        {label} {error && " (Required)"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ""}
        autoFocus={autoFocus}
        className={cn(
          "text-foreground placeholder:text-muted-foreground/20 w-full border-b bg-transparent pt-3 pb-3 text-lg font-medium tracking-tight transition-colors focus:outline-none md:text-xl",
          error
            ? "border-red-500/30 focus:border-red-500/60"
            : "focus:border-primary/40 border-white/[0.06]",
          inputClassName,
        )}
      />
      {/* Focus line animation */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-px transition-all duration-500",
          error ? "bg-red-500" : "bg-primary",
          focused ? "w-full" : "w-0",
        )}
      />
    </div>
  );
}
