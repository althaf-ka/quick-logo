import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";
import { Button } from "@quicklogo/ui/components/button";
import { Label } from "@quicklogo/ui/components/label";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";

const VIBES = [
  "Modern",
  "Minimalist",
  "Playful",
  "Bold",
  "Corporate",
  "Fun",
  "Elegant",
  "Classic",
  "Tech-focused",
  "Organic",
  "Futuristic",
  "Luxurious",
  "Earthy",
  "Retro",
  "Handcrafted"
];

const TYPOGRAPHY_SPECIMENS: Record<string, { char: string; category: string }> =
  {
    "modern-sans": { char: "Ag", category: "Sans-Serif" },
    "classic-serif": { char: "Rg", category: "Serif" },
    "playful-display": { char: "Hk", category: "Display" },
    "elegant-script": { char: "Qy", category: "Script" },
    "tech-mono": { char: "0x", category: "Monospace" },
    "bold-impact": { char: "AZ", category: "Impact" },
    "friendly-round": { char: "ab", category: "Rounded" },
    "luxury-minimal": { char: "Ls", category: "Thin" },
  };

interface CreativeDirectionStepProps {
  selectedVibes: string[];
  setSelectedVibes: React.Dispatch<React.SetStateAction<string[]>>;
  typography: string;
  setTypography: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function CreativeDirectionStep({
  selectedVibes,
  setSelectedVibes,
  typography,
  setTypography,
  onBack,
  onContinue,
}: CreativeDirectionStepProps) {
  const [showErrors, setShowErrors] = useState(false);

  const canProceed = selectedVibes.length > 0 && typography !== "";

  const handleContinue = () => {
    if (canProceed) {
      onContinue();
    } else {
      setShowErrors(true);
    }
  };

  const handleVibeToggle = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
    if (showErrors) setShowErrors(false);
  };

  const handleTypographySelect = (id: string) => {
    setTypography(id);
    if (showErrors) setShowErrors(false);
  };

  const typographyOptions = Object.entries(TYPOGRAPHY_REGISTRY);

  return (
    <motion.div
      layoutId="section-creative"
      key="creative-active"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 w-full space-y-10 bg-zinc-950 p-8 shadow-2xl ring-1 ring-white/[0.06] md:p-10"
    >
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center font-mono text-[10px] font-black">
            2
          </div>
          <h2 className="text-muted-foreground/40 text-[10px] font-bold tracking-widest uppercase">
            Creative Direction
          </h2>
        </div>
        <p className="text-foreground text-2xl leading-tight font-semibold tracking-tighter md:text-3xl">
          Set the creative direction.
        </p>
      </div>

      {/* Brand Vibes */}
      <div className="space-y-4">
        <Label
          className={cn(
            "text-[10px] font-bold tracking-widest uppercase transition-colors",
            showErrors && selectedVibes.length === 0
              ? "text-red-500/80"
              : "text-muted-foreground/50",
          )}
        >
          Brand Vibe{" "}
          {showErrors && selectedVibes.length === 0 && "(Select at least one)"}
        </Label>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((vibe) => {
            const isSelected = selectedVibes.includes(vibe);
            return (
              <motion.button
                key={vibe}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVibeToggle(vibe)}
                className={cn(
                  "cursor-pointer px-4 py-2.5 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200",
                  isSelected
                    ? "bg-primary/15 text-primary ring-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.1)] ring-1"
                    : showErrors && selectedVibes.length === 0
                      ? "text-muted-foreground/60 bg-white/[0.02] ring-1 ring-red-500/40 hover:bg-white/[0.04]"
                      : "text-muted-foreground/60 hover:text-muted-foreground bg-white/[0.02] ring-1 ring-white/[0.06] hover:bg-white/[0.04] hover:ring-white/[0.1]",
                )}
              >
                {vibe}
              </motion.button>
            );
          })}
        </div>
        {selectedVibes.length > 0 ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary/40 font-mono text-[10px] tracking-wider"
          >
            {selectedVibes.length} selected
          </motion.p>
        ) : null}
      </div>

      {/* Typography */}
      <div className="w-full space-y-4">
        <Label
          className={cn(
            "text-[10px] font-bold tracking-widest uppercase transition-colors",
            showErrors && !typography
              ? "text-red-500/80"
              : "text-muted-foreground/50",
          )}
        >
          Typography Style {showErrors && !typography && "(Select a style)"}
        </Label>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typographyOptions.map(([id, styleHint]) => {
            const isSelected = typography === id;
            const specimen = TYPOGRAPHY_SPECIMENS[id] || {
              char: "Aa",
              category: "Font",
            };
            return (
              <motion.div
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTypographySelect(id)}
                className={cn(
                  "group relative flex cursor-pointer flex-col overflow-hidden border transition-all duration-200",
                  isSelected
                    ? "bg-primary/[0.05] border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.08)]"
                    : showErrors && !typography
                      ? "border-red-500/40 bg-white/[0.01]"
                      : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]",
                )}
              >
                {/* Selected accent line */}
                {isSelected ? (
                  <div className="bg-primary absolute top-0 right-0 left-0 h-0.5" />
                ) : null}

                {/* Specimen preview area */}
                <div
                  className={cn(
                    "relative flex items-center justify-center border-b py-6 transition-colors",
                    isSelected
                      ? "border-primary/10 bg-primary/[0.03]"
                      : "border-white/[0.04] bg-white/[0.005]",
                  )}
                >
                  <span
                    className={cn(
                      "text-4xl font-bold tracking-tighter transition-colors duration-200 select-none",
                      isSelected
                        ? "text-primary"
                        : "text-foreground/20 group-hover:text-foreground/40",
                    )}
                  >
                    {specimen.char}
                  </span>
                  {/* Category tag */}
                  <span
                    className={cn(
                      "absolute top-2 right-2 px-1.5 py-0.5 font-mono text-[8px] tracking-widest uppercase ring-1 transition-colors",
                      isSelected
                        ? "text-primary/60 ring-primary/20 bg-primary/[0.05]"
                        : "text-muted-foreground/25 ring-white/[0.06]",
                    )}
                  >
                    {specimen.category}
                  </span>
                </div>

                {/* Info area */}
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-bold tracking-tight",
                        isSelected ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {styleHint.label}
                    </span>
                    <span className="text-muted-foreground/40 mt-1 block text-[10px] leading-relaxed">
                      {styleHint.description}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center border transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/[0.1]",
                    )}
                  >
                    {isSelected ? (
                      <CheckIcon weight="bold" className="size-2.5" />
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="rounded-none font-mono text-xs tracking-wider uppercase"
        >
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          className="rounded-none px-6 font-mono text-xs tracking-wider uppercase"
        >
          Continue <ArrowRightIcon className="ml-2 size-4" />
        </Button>
      </div>
    </motion.div>
  );
}
