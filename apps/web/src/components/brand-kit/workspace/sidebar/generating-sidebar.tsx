import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  LightningIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";
import {
  stepReveal,
  staggerContainer,
  staggerItem,
} from "@/lib/motion/variants";
import type { DeliverablesConfig } from "@/types/brand-kit";

const STEPS = [
  { label: "Parsing instructions", duration: 2000 },
  { label: "Analyzing layout rules", duration: 3000 },
  { label: "Generative expansion", duration: 4000 },
  { label: "Rendering final assets", duration: 0 },
];

export function GeneratingSidebar({
  deliverables,
  totalCredits,
}: {
  deliverables?: DeliverablesConfig;
  totalCredits?: number;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 2000);
    const timer2 = setTimeout(() => setActiveStep(2), 5000);
    const timer3 = setTimeout(() => setActiveStep(3), 9000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Pipeline Steps */}
      <div className="space-y-3">
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Pipeline Status
        </h3>
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute top-2 bottom-2 left-[9px] w-px bg-white/[0.06]" />
          <motion.div
            className="bg-primary/60 absolute top-2 left-[9px] w-px"
            initial={{ height: 0 }}
            animate={{
              height: `${Math.min(100, (activeStep / (STEPS.length - 1)) * 100)}%`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {STEPS.map((step, i) => {
            const isComplete = activeStep > i;
            const isActive = activeStep === i;
            const isPending = activeStep < i;

            return (
              <motion.div
                key={i}
                custom={i}
                variants={stepReveal}
                initial="hidden"
                animate="visible"
                className={cn(
                  "relative flex items-start gap-4 py-3 pl-0 transition-opacity duration-500",
                  isPending && "opacity-30",
                )}
              >
                {/* Step indicator */}
                <div className="relative z-10 flex size-[18px] shrink-0 items-center justify-center">
                  {isComplete ? (
                    <CheckCircleIcon
                      weight="fill"
                      className="text-primary size-[18px]"
                    />
                  ) : isActive ? (
                    <div className="relative flex items-center justify-center">
                      <div className="bg-primary/20 absolute inset-0 animate-ping rounded-none" />
                      <CircleDashedIcon
                        weight="bold"
                        className="text-primary size-[18px] animate-spin"
                        style={{ animationDuration: "3s" }}
                      />
                    </div>
                  ) : (
                    <div className="size-[18px] border border-white/[0.08] bg-zinc-950" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-mono text-[11px] font-medium tracking-wider uppercase",
                      isComplete
                        ? "text-muted-foreground/70"
                        : isActive
                          ? "text-primary"
                          : "text-muted-foreground/40",
                    )}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-primary/60 font-mono text-[9px] tracking-wider"
                    >
                      In progress...
                    </motion.span>
                  )}
                  {isComplete && (
                    <span className="text-muted-foreground/30 font-mono text-[9px] tracking-wider">
                      Done
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Time estimate */}
      <div className="space-y-3 border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/50 font-mono text-[10px] tracking-wider uppercase">
            Elapsed Time
          </span>
          <span className="text-foreground font-mono text-[10px] tabular-nums">
            {elapsed}s
          </span>
        </div>
        {/* Progress bar */}
        <div className="relative h-px w-full overflow-hidden bg-white/[0.06]">
          <motion.div
            className="bg-primary/60 absolute h-full w-1/3"
            animate={{
              left: ["-33%", "100%"],
            }}
            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
          />
        </div>
      </div>

      {/* Generation Summary */}
      {(deliverables || totalCredits !== undefined) && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Order Summary
          </h3>
          <div className="space-y-4 border border-white/[0.06] bg-white/[0.02] p-4">
            {deliverables && (
              <motion.div variants={staggerItem}>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Selected Add-ons
                </span>
                <ul className="text-muted-foreground space-y-1.5 font-mono text-[11px]">
                  {Object.entries(deliverables)
                    .filter(([, value]) => value.enabled)
                    .map(([key]) => {
                      const label = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase());
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <CheckCircleIcon className="size-3 text-emerald-400/70" />
                          {label}
                        </li>
                      );
                    })}
                </ul>
              </motion.div>
            )}

            {totalCredits !== undefined && (
              <motion.div variants={staggerItem} className="pt-2">
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Total Cost
                </span>
                <div className="text-foreground flex items-center gap-1.5 font-mono text-sm font-black uppercase">
                  <LightningIcon
                    weight="fill"
                    className="size-3.5 text-amber-400"
                  />
                  {totalCredits} Credits
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
