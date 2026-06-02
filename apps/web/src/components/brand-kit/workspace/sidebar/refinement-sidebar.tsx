import { motion } from "motion/react";
import { XIcon, CrosshairIcon, LightbulbIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { getSectionLabel } from "@quicklogo/shared";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

export interface RefinementSidebarProps {
  refiningSectionId: string | null;
  onCloseRefinement: () => void;
}

const TIPS = [
  {
    text: "Be specific about colors, moods, or references.",
    label: "Precision",
  },
  { text: "Ask to change layout style or composition.", label: "Structure" },
  {
    text: "Reference other brand kit assets for consistency.",
    label: "Cohesion",
  },
];

export function RefinementSidebar({
  refiningSectionId,
  onCloseRefinement,
}: RefinementSidebarProps) {
  const sectionLabel = refiningSectionId
    ? getSectionLabel(refiningSectionId)
    : "Asset";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <motion.div
        variants={staggerItem}
        className="flex items-center justify-between"
      >
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Focus Mode
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCloseRefinement}
          className="rounded-none hover:bg-white/[0.04]"
        >
          <XIcon className="size-4" />
        </Button>
      </motion.div>

      {/* Active Section Card */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="border-primary/20 bg-primary/[0.03] relative space-y-3 overflow-hidden border p-5">
          {/* Pulsing border accent */}
          <div className="bg-primary absolute top-0 left-0 h-full w-1 animate-pulse" />

          <div className="flex items-center gap-2.5 pl-3">
            <CrosshairIcon weight="bold" className="text-primary size-4" />
            <h4 className="text-primary font-mono text-[11px] font-black tracking-wider uppercase">
              Editing {sectionLabel}
            </h4>
          </div>
          <p className="text-muted-foreground/60 pl-3 font-mono text-xs leading-relaxed">
            Other assets are dimmed. Use the prompt bar below to describe your
            changes.
          </p>
        </div>
      </motion.div>

      {/* Prompting Tips */}
      <motion.div
        variants={staggerItem}
        className="space-y-3 border-t border-white/[0.06] pt-4"
      >
        <div className="flex items-center gap-2">
          <LightbulbIcon
            weight="bold"
            className="text-muted-foreground/40 size-3"
          />
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Prompting Tips
          </h3>
        </div>
        <div className="space-y-2">
          {TIPS.map((tip, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="group cursor-default border border-white/[0.06] bg-white/[0.01] p-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <span className="text-primary/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                {tip.label}
              </span>
              <span className="text-muted-foreground/60 block font-mono text-[11px] leading-relaxed">
                {tip.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Keyboard shortcut hint */}
      <motion.div
        variants={staggerItem}
        className="border-t border-white/[0.06] py-3 text-center"
      >
        <span className="text-muted-foreground/25 font-mono text-[9px] tracking-wider">
          Press{" "}
          <kbd className="text-muted-foreground/40 border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5">
            ⌘ Enter
          </kbd>{" "}
          to submit
        </span>
      </motion.div>
    </motion.div>
  );
}
