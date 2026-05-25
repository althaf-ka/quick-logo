import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { FloatingInput } from "../components/floating-input";

interface FoundationStepProps {
  brandName: string;
  setBrandName: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  targetAudience: string;
  setTargetAudience: (v: string) => void;
  onContinue: () => void;
}

export function FoundationStep({
  brandName,
  setBrandName,
  industry,
  setIndustry,
  tagline,
  setTagline,
  targetAudience,
  setTargetAudience,
  onContinue,
}: FoundationStepProps) {
  const [showErrors, setShowErrors] = useState(false);

  const canProceed =
    brandName.trim().length > 0 &&
    industry.trim().length > 0 &&
    targetAudience.trim().length > 0;

  const handleContinue = () => {
    if (canProceed) {
      onContinue();
    } else {
      setShowErrors(true);
    }
  };

  return (
    <motion.div
      layoutId="section-foundation"
      key="foundation-active"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // Smooth, non-bouncy ease
      className="w-full space-y-10 bg-zinc-950 p-8 shadow-2xl ring-1 ring-white/[0.06] md:p-10"
    >
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center font-mono text-[10px] font-black">
            1
          </div>
          <h2 className="text-muted-foreground/40 text-[10px] font-bold tracking-widest uppercase">
            Foundation
          </h2>
        </div>
        <p className="text-foreground text-2xl leading-tight font-semibold tracking-tighter md:text-3xl">
          Tell us about your brand
        </p>
      </div>

      <div className="space-y-10">
        <FloatingInput
          label="Brand Name"
          value={brandName}
          onChange={(v) => {
            setBrandName(v);
            if (showErrors && v.trim().length > 0) setShowErrors(false);
          }}
          placeholder="e.g. Acme Corp"
          autoFocus={!brandName}
          error={showErrors && brandName.trim().length === 0}
        />
        <FloatingInput
          label="Industry"
          value={industry}
          onChange={(v) => {
            setIndustry(v);
            if (showErrors && v.trim().length > 0) setShowErrors(false);
          }}
          placeholder="e.g. B2B SaaS, Artisanal Coffee"
          autoFocus={!!brandName}
          error={showErrors && industry.trim().length === 0}
        />
        <FloatingInput
          label="Tagline (Optional)"
          value={tagline}
          onChange={setTagline}
          placeholder="e.g. Just Do It"
        />
        <FloatingInput
          label="Target Audience"
          value={targetAudience}
          onChange={(v) => {
            setTargetAudience(v);
            if (showErrors && v.trim().length > 0) setShowErrors(false);
          }}
          placeholder="Who is this for? e.g. Gen Z Professionals"
          error={showErrors && targetAudience.trim().length === 0}
        />
      </div>

      <div className="flex items-center justify-end pt-2">
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
