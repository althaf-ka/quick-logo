import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircleIcon,
  LightningIcon,
  ClockIcon,
  LightbulbIcon,
} from "@phosphor-icons/react";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import type { DeliverablesConfig } from "@/types/brand-kit";

import { GENERATING_TIPS } from "@quicklogo/shared";

export function GeneratingSidebar({
  deliverables,
  totalCredits,
}: {
  deliverables?: DeliverablesConfig;
  totalCredits?: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GENERATING_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const selectedAddons = deliverables
    ? Object.entries(deliverables).filter(([, value]) => value.enabled)
    : [];

  return (
    <div className="flex flex-col gap-8">
      {/* Dynamic Timer */}
      <div className="border-primary/20 bg-primary/5 relative overflow-hidden border p-6 text-center">
        <div
          className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.15),transparent_70%)]"
          style={{ animationDuration: "3s" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <ClockIcon
            weight="duotone"
            className="text-primary size-5 animate-pulse"
          />
          <div className="text-foreground font-mono text-2xl font-black tracking-widest tabular-nums">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </div>
          <span className="text-primary/60 font-mono text-[9px] font-bold tracking-widest uppercase">
            Crafting Brand Kit
          </span>
        </div>
      </div>

      {/* Generation Summary */}
      {deliverables || totalCredits !== undefined ? (
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
            {deliverables ? (
              <motion.div variants={staggerItem}>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Selected Add-ons
                </span>
                {selectedAddons.length > 0 ? (
                  <ul className="text-muted-foreground space-y-1.5 font-mono text-[11px]">
                    {selectedAddons.map(([key]) => {
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
                ) : (
                  <div className="text-muted-foreground/60 flex items-center gap-2 font-mono text-[10px] italic">
                    <div className="bg-muted-foreground/20 size-1 rounded-full" />
                    Base Generation Only
                  </div>
                )}
              </motion.div>
            ) : null}

            {totalCredits !== undefined ? (
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
            ) : null}
          </div>
        </motion.div>
      ) : null}

      {/* Did You Know? */}
      <div className="space-y-3">
        <h3 className="text-muted-foreground/60 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
          <LightbulbIcon weight="fill" className="size-3 text-amber-400/70" />
          Did you know?
        </h3>
        <div className="relative flex h-24 items-center border border-white/[0.06] bg-white/[0.02] p-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-muted-foreground font-mono text-[10px] leading-relaxed"
            >
              &quot;{GENERATING_TIPS[tipIndex]}&quot;
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
