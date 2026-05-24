import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SparkleIcon,
  CheckSquareIcon,
  UploadIcon,
  ArrowRightIcon,
  PencilSimpleIcon,
  XIcon,
  Shapes,
  ShareNetwork,
  IdentificationCard,
  AppWindow,
  ImageIcon,
  PresentationChart,
  BookOpenText,
  Palette,
  TextT,
  CheckIcon,
  ArrowLeftIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";
import type { DeliverablesConfig, WorkspaceState } from "@/types/brand-kit";
import { Button } from "@quicklogo/ui/components/button";
import { Label } from "@quicklogo/ui/components/label";
import { Input } from "@quicklogo/ui/components/input";
import { Textarea } from "@quicklogo/ui/components/textarea";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";

interface BrandQuestionnaireProps {
  workspaceState: WorkspaceState;
  setWorkspaceState: (state: WorkspaceState) => void;
  brandName: string;
  setBrandName: (v: string) => void;
  deliverables: DeliverablesConfig;
  setDeliverables: (deliverables: DeliverablesConfig) => void;
  typography: string;
  setTypography: (v: string) => void;
  onMockupUpload: (files: File[]) => void;
  onMockupRemove?: (index: number) => void;
  mockupPreviews: string[];
  onGenerate: (prompt: string) => void;
  isGenerating?: boolean;
  totalCredits: number;
}

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
];

// Font specimen characters per typography style
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

const DELIVERABLES_CONFIG = [
  {
    id: "logoVariations",
    label: "Logo Variations",
    desc: "Alternate layouts & lockups",
    cost: 2,
    icon: <Shapes weight="duotone" className="size-5" />,
  },
  {
    id: "favicon",
    label: "Favicon & Icons",
    desc: "App icons & favicons",
    cost: 1,
    icon: <AppWindow weight="duotone" className="size-5" />,
  },
  {
    id: "brandedBackdrops",
    label: "Branded Backdrops",
    desc: "Wallpapers & patterns",
    cost: 2,
    icon: <ImageIcon weight="duotone" className="size-5" />,
  },
  {
    id: "socialMedia",
    label: "Social Media Kit",
    desc: "Profile pics & covers",
    cost: 3,
    icon: <ShareNetwork weight="duotone" className="size-5" />,
  },
  {
    id: "businessCard",
    label: "Business Card",
    desc: "Print-ready designs",
    cost: 2,
    icon: <IdentificationCard weight="duotone" className="size-5" />,
  },
  {
    id: "brandPresentation",
    label: "Brand Presentation",
    desc: "Full brand guidelines",
    cost: 3,
    icon: <PresentationChart weight="duotone" className="size-5" />,
  },
  {
    id: "brandGuidelines",
    label: "Brand Guidelines",
    desc: "Rules and PDF exports",
    cost: 0,
    icon: <BookOpenText weight="duotone" className="size-5" />,
  },
] as const;

const DELIVERABLES_WITH_SETTINGS: Array<keyof DeliverablesConfig> = [
  "socialMedia",
  "brandGuidelines",
  "businessCard",
  "brandPresentation",
];

const inputClassName =
  "h-10 rounded-none border-white/[0.08] bg-zinc-950/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20";

// --- Floating Label Input ---
function FloatingInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="group relative">
      <label
        className={cn(
          "pointer-events-none absolute left-0 font-mono tracking-widest uppercase transition-all duration-300",
          isActive
            ? "text-primary/60 -top-5 text-[9px] font-bold"
            : "text-muted-foreground/30 top-3 text-[10px] font-semibold",
        )}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ""}
        autoFocus={autoFocus}
        className="text-foreground placeholder:text-muted-foreground/20 focus:border-primary/40 w-full border-b border-white/[0.06] bg-transparent pt-3 pb-3 text-lg font-medium tracking-tight transition-colors focus:outline-none md:text-xl"
      />
      {/* Focus line animation */}
      <div
        className={cn(
          "bg-primary absolute bottom-0 left-0 h-px transition-all duration-500",
          focused ? "w-full" : "w-0",
        )}
      />
    </div>
  );
}

// --- Section Pill (collapsed step) ---
const SectionPill = ({
  title,
  summary,
  onClick,
}: {
  title: string;
  summary: string;
  onClick: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="group flex w-full cursor-pointer items-center justify-between bg-white/[0.01] p-4 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.03] hover:ring-white/[0.1]"
    onClick={onClick}
  >
    <div className="min-w-0">
      <h3 className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
        {title}
      </h3>
      <p className="text-foreground/80 mt-1 truncate text-sm font-medium">
        {summary}
      </p>
    </div>
    <PencilSimpleIcon className="text-muted-foreground/30 group-hover:text-primary ml-3 size-4 shrink-0 transition-colors" />
  </motion.div>
);

export function BrandQuestionnaire({
  workspaceState,
  setWorkspaceState,
  brandName,
  setBrandName,
  deliverables,
  setDeliverables,
  typography,
  setTypography,
  onMockupUpload,
  onMockupRemove,
  mockupPreviews,
  onGenerate,
  isGenerating,
  totalCredits,
}: BrandQuestionnaireProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [industry, setIndustry] = useState("");
  const [tagline, setTagline] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [expandedConfig, setExpandedConfig] = useState<
    keyof DeliverablesConfig | null
  >(null);

  const [socials, setSocials] = useState({
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
  });

  const [contact, setContact] = useState({
    name: "",
    title: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
    website: "",
  });

  const [guidelines, setGuidelines] = useState({
    depth: "essential" as "essential" | "complete",
    toneOfVoice: "",
    includeAccessibility: true,
    includeLogoRules: true,
    includeDoDonts: true,
  });

  const handleVibeToggle = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  };

  const handleDeliverableToggle = (key: keyof DeliverablesConfig) => {
    const willEnable = !deliverables[key].enabled;

    setDeliverables({
      ...deliverables,
      [key]: {
        ...deliverables[key],
        enabled: willEnable,
      },
    });

    const hasSettings = [
      "socialMedia",
      "brandGuidelines",
      "businessCard",
      "brandPresentation",
    ].includes(key);
    if (willEnable && hasSettings) {
      setExpandedConfig(key);
    } else if (!willEnable && expandedConfig === key) {
      setExpandedConfig(null);
    }
  };

  const handleGenerate = useCallback(() => {
    const prompt = [];
    if (brandName) prompt.push(`Brand Name: ${brandName}`);
    if (tagline) prompt.push(`Tagline: ${tagline}`);
    if (industry) prompt.push(`Industry: ${industry}`);
    if (targetAudience) prompt.push(`Target Audience: ${targetAudience}`);
    if (selectedVibes.length > 0)
      prompt.push(`Brand Vibe: ${selectedVibes.join(", ")}`);
    if (typography)
      prompt.push(
        `Typography Preference: ${TYPOGRAPHY_REGISTRY[typography]?.label || typography}`,
      );
    if (additionalContext.trim()) {
      prompt.push(`\nAdditional Instructions:\n${additionalContext.trim()}`);
    }

    if (deliverables.businessCard.enabled) {
      prompt.push(`\nBusiness Card Details:`);
      if (contact.name) prompt.push(`Name: ${contact.name}`);
      if (contact.title) prompt.push(`Title: ${contact.title}`);
      if (contact.companyName)
        prompt.push(`Company Name: ${contact.companyName}`);
      if (contact.phone) prompt.push(`Phone: ${contact.phone}`);
      if (contact.email) prompt.push(`Email: ${contact.email}`);
      if (contact.address) prompt.push(`Address: ${contact.address}`);
      if (contact.website) prompt.push(`Website: ${contact.website}`);
    }

    if (deliverables.socialMedia.enabled) {
      prompt.push(`\nSocial Media Links:`);
      if (socials.instagram) prompt.push(`Instagram: ${socials.instagram}`);
      if (socials.twitter) prompt.push(`Twitter/X: ${socials.twitter}`);
      if (socials.linkedin) prompt.push(`LinkedIn: ${socials.linkedin}`);
      if (socials.youtube) prompt.push(`YouTube: ${socials.youtube}`);
      if (socials.tiktok) prompt.push(`TikTok: ${socials.tiktok}`);
    }

    if (deliverables.brandGuidelines.enabled) {
      prompt.push(`\nBrand Guidelines Settings:`);
      prompt.push(`Depth: ${guidelines.depth}`);
      if (guidelines.toneOfVoice)
        prompt.push(`Tone of Voice: ${guidelines.toneOfVoice}`);
      prompt.push(
        `Include Accessibility Rules: ${guidelines.includeAccessibility ? "Yes" : "No"}`,
      );
      prompt.push(
        `Include Logo Usage Rules: ${guidelines.includeLogoRules ? "Yes" : "No"}`,
      );
      prompt.push(
        `Include Do/Don't Examples: ${guidelines.includeDoDonts ? "Yes" : "No"}`,
      );
    }

    onGenerate(prompt.join("\n"));
  }, [
    brandName,
    tagline,
    industry,
    targetAudience,
    selectedVibes,
    typography,
    deliverables.businessCard.enabled,
    deliverables.socialMedia.enabled,
    deliverables.brandGuidelines.enabled,
    contact,
    socials,
    guidelines,
    additionalContext,
    onGenerate,
  ]);

  const canProceedToCreative =
    brandName.trim().length > 0 &&
    industry.trim().length > 0 &&
    targetAudience.trim().length > 0;
  const canProceedToDeliverables =
    selectedVibes.length > 0 && typography !== "";
  const canGenerate = canProceedToCreative && canProceedToDeliverables;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (workspaceState === "foundation" && canProceedToCreative) {
          setWorkspaceState("creative-direction");
        } else if (
          workspaceState === "creative-direction" &&
          canProceedToDeliverables
        ) {
          setWorkspaceState("deliverables");
        } else if (
          workspaceState === "deliverables" &&
          canGenerate &&
          !isGenerating
        ) {
          handleGenerate();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canProceedToCreative,
    canProceedToDeliverables,
    canGenerate,
    workspaceState,
    isGenerating,
    handleGenerate,
    setWorkspaceState,
  ]);

  const typographyOptions = Object.entries(TYPOGRAPHY_REGISTRY);
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-start px-4 py-12 md:py-20">
      <div className="flex w-full max-w-2xl flex-col items-center space-y-6">
        <AnimatePresence mode="popLayout">
          {/* ========== FOUNDATION SECTION ========== */}
          {workspaceState === "foundation" ? (
            <motion.div
              layoutId="section-foundation"
              key="foundation-active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                  What are we building today?
                </p>
              </div>

              <div className="space-y-10">
                <FloatingInput
                  label="Brand Name"
                  value={brandName}
                  onChange={setBrandName}
                  placeholder="e.g. Acme Corp"
                  autoFocus={!brandName}
                />
                <FloatingInput
                  label="Industry"
                  value={industry}
                  onChange={setIndustry}
                  placeholder="e.g. B2B SaaS, Artisanal Coffee"
                  autoFocus={!!brandName}
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
                  onChange={setTargetAudience}
                  placeholder="Who is this for? e.g. Gen Z Professionals"
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
                <span className="text-muted-foreground/20 font-mono text-[9px] tracking-wider">
                  <kbd className="border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5">
                    ⌘ Enter
                  </kbd>{" "}
                  to continue
                </span>
                <Button
                  size="lg"
                  disabled={!canProceedToCreative}
                  onClick={() => setWorkspaceState("creative-direction")}
                  className="rounded-none px-6 font-mono text-xs tracking-wider uppercase"
                >
                  Continue <ArrowRightIcon className="ml-2 size-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <SectionPill
              key="foundation-pill"
              title="1. Foundation"
              summary={`${brandName || "No Brand"} • ${industry || "Blank Industry"} for ${targetAudience || "Blank Audience"}`}
              onClick={() => setWorkspaceState("foundation")}
            />
          )}

          {/* ========== CREATIVE DIRECTION SECTION ========== */}
          {(workspaceState === "creative-direction" ||
            workspaceState === "deliverables") &&
            (workspaceState === "creative-direction" ? (
              <motion.div
                layoutId="section-creative"
                key="creative-active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                  <Label className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                    Brand Vibe
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
                            "px-4 py-2.5 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200",
                            isSelected
                              ? "bg-primary/15 text-primary ring-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.1)] ring-1"
                              : "text-muted-foreground/60 hover:text-muted-foreground bg-white/[0.02] ring-1 ring-white/[0.06] hover:bg-white/[0.04] hover:ring-white/[0.1]",
                          )}
                        >
                          {isSelected && (
                            <CheckIcon
                              weight="bold"
                              className="-mt-0.5 mr-1.5 inline size-3"
                            />
                          )}
                          {vibe}
                        </motion.button>
                      );
                    })}
                  </div>
                  {selectedVibes.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-primary/40 font-mono text-[10px] tracking-wider"
                    >
                      {selectedVibes.length} selected
                    </motion.p>
                  )}
                </div>

                {/* Typography */}
                <div className="w-full space-y-4">
                  <Label className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                    Typography Style
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
                          onClick={() => setTypography(id)}
                          className={cn(
                            "group relative flex cursor-pointer flex-col overflow-hidden border transition-all duration-200",
                            isSelected
                              ? "bg-primary/[0.05] border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.08)]"
                              : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]",
                          )}
                        >
                          {/* Selected accent line */}
                          {isSelected && (
                            <div className="bg-primary absolute top-0 right-0 left-0 h-0.5" />
                          )}

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
                                  isSelected
                                    ? "text-foreground"
                                    : "text-foreground/70",
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
                              {isSelected && (
                                <CheckIcon weight="bold" className="size-2.5" />
                              )}
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
                    onClick={() => setWorkspaceState("foundation")}
                    className="rounded-none font-mono text-xs tracking-wider uppercase"
                  >
                    <ArrowLeftIcon className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!canProceedToDeliverables}
                    onClick={() => setWorkspaceState("deliverables")}
                    className="rounded-none px-6 font-mono text-xs tracking-wider uppercase"
                  >
                    Continue <ArrowRightIcon className="ml-2 size-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <SectionPill
                key="creative-pill"
                title="2. Creative Direction"
                summary={`${selectedVibes.join(", ") || "No vibes"} • ${TYPOGRAPHY_REGISTRY[typography]?.label || "No typography"}`}
                onClick={() => setWorkspaceState("creative-direction")}
              />
            ))}

          {/* ========== DELIVERABLES SECTION ========== */}
          {workspaceState === "deliverables" && (
            <motion.div
              layoutId="section-deliverables"
              key="deliverables-active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mt-4 w-full space-y-10 bg-zinc-950 p-8 shadow-2xl ring-1 ring-white/[0.06] md:p-10"
            >
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center font-mono text-[10px] font-black">
                    3
                  </div>
                  <h2 className="text-muted-foreground/40 text-[10px] font-bold tracking-widest uppercase">
                    Deliverables
                  </h2>
                </div>
                <p className="text-foreground text-2xl leading-tight font-semibold tracking-tighter md:text-3xl">
                  What do you need us to generate?
                </p>
              </div>

              {/* Base Kit */}
              <div className="space-y-4">
                <Label className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                  Included in Base Kit
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    {
                      title: "Core Logo Lockups",
                      desc: "Primary, secondary, and mark-only.",
                      icon: (
                        <Shapes
                          weight="duotone"
                          className="text-primary/60 size-5"
                        />
                      ),
                    },
                    {
                      title: "Color Palette",
                      desc: "Extracted hex codes & thematic colors.",
                      icon: (
                        <Palette
                          weight="duotone"
                          className="text-primary/60 size-5"
                        />
                      ),
                    },
                    {
                      title: "Typography Rules",
                      desc: "Font pairings and hierarchy setup.",
                      icon: (
                        <TextT
                          weight="duotone"
                          className="text-primary/60 size-5"
                        />
                      ),
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 border border-white/[0.04] bg-white/[0.01] p-4 opacity-70"
                    >
                      <div className="flex items-center justify-between">
                        {item.icon}
                        <CheckSquareIcon
                          weight="fill"
                          className="text-primary/40 size-3.5"
                        />
                      </div>
                      <div>
                        <h4 className="text-foreground/80 mt-1 text-xs font-semibold">
                          {item.title}
                        </h4>
                        <p className="text-muted-foreground/40 mt-1 text-[10px] leading-tight">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverables Section */}
              <div className="space-y-4 border-t border-white/[0.04] pt-6">
                <div className="grid grid-flow-row-dense grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {DELIVERABLES_CONFIG.map((item, idx) => {
                    const key = item.id as keyof DeliverablesConfig;
                    const isSelected = deliverables[key].enabled;
                    const hasSettings =
                      DELIVERABLES_WITH_SETTINGS.includes(key);
                    const isExpanded = expandedConfig === key;

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        layout
                        className={cn(
                          "group relative flex min-h-[150px] flex-col overflow-hidden transition-all duration-300",
                          hasSettings && "sm:col-span-2 xl:col-span-3",
                          isSelected
                            ? "bg-primary/[0.04] ring-primary/25 shadow-[0_0_24px_rgba(var(--primary),0.05)] ring-1"
                            : "bg-white/[0.01] ring-1 ring-white/[0.06] hover:bg-white/[0.03] hover:ring-white/[0.1]",
                        )}
                      >
                        {isSelected && (
                          <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />
                        )}
                        <div className="p-5">
                          <div className="mb-3 flex w-full items-start justify-between">
                            <div
                              className={cn(
                                "transition-colors duration-200",
                                isSelected
                                  ? "text-primary"
                                  : "text-muted-foreground/40 group-hover:text-muted-foreground/70",
                              )}
                            >
                              {item.icon}
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase ring-1",
                                  isSelected
                                    ? "bg-primary/15 text-primary ring-primary/20"
                                    : "text-muted-foreground/40 bg-white/[0.03] ring-white/[0.08]",
                                )}
                              >
                                {item.cost === 0 ? (
                                  "Free"
                                ) : (
                                  <>
                                    <SparkleIcon
                                      weight="fill"
                                      className="size-2.5"
                                    />
                                    {item.cost}
                                  </>
                                )}
                              </span>
                              <div
                                className={cn(
                                  "flex size-5 cursor-pointer items-center justify-center transition-all duration-200",
                                  isSelected
                                    ? "text-primary"
                                    : "text-white/[0.08] hover:text-white/[0.2]",
                                )}
                                onClick={() => handleDeliverableToggle(key)}
                              >
                                {isSelected ? (
                                  <CheckSquareIcon
                                    weight="fill"
                                    className="size-5"
                                  />
                                ) : (
                                  <div className="size-4 border-2 border-current" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleDeliverableToggle(key)}
                          >
                            <h3
                              className={cn(
                                "mb-1 text-sm font-bold tracking-tight",
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-foreground/80",
                              )}
                            >
                              {item.label}
                            </h3>
                            <p className="text-muted-foreground/50 text-[11px] leading-relaxed">
                              {item.desc}
                            </p>
                          </div>

                          {isSelected && hasSettings && (
                            <div className="mt-5 border-t border-white/[0.04] pt-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedConfig(isExpanded ? null : key);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-center gap-2 border border-dashed px-3 py-2.5 font-mono text-[9px] font-bold tracking-widest uppercase transition-all",
                                  isExpanded
                                    ? "bg-primary/[0.05] text-primary border-primary/30"
                                    : "text-muted-foreground/60 hover:border-primary/50 hover:text-primary hover:bg-primary/[0.02] border-white/[0.15] bg-transparent",
                                )}
                              >
                                {isExpanded
                                  ? "Hide"
                                  : key === "socialMedia"
                                    ? "Social Links"
                                    : "Settings"}
                                <CaretDownIcon
                                  weight="bold"
                                  className={cn(
                                    "size-3 transition-transform duration-300",
                                    isExpanded && "text-primary rotate-180",
                                  )}
                                />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Inline expandable config panel */}
                        <AnimatePresence>
                          {isSelected && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pt-0 pb-5">
                                {key === "socialMedia" && (
                                  <div className="space-y-3">
                                    <span className="text-muted-foreground/50 font-mono text-[9px] font-bold tracking-widest uppercase">
                                      Social links or user IDs
                                    </span>
                                    <p className="text-muted-foreground/45 text-xs leading-relaxed">
                                      Add handles, profile URLs, or page IDs for
                                      the profiles you want included.
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                      {[
                                        [
                                          "instagram",
                                          "Instagram",
                                          "@brand or profile URL",
                                        ],
                                        [
                                          "twitter",
                                          "X / Twitter",
                                          "@brand or profile URL",
                                        ],
                                        [
                                          "linkedin",
                                          "LinkedIn",
                                          "Company page URL or ID",
                                        ],
                                        [
                                          "youtube",
                                          "YouTube",
                                          "Channel URL or handle",
                                        ],
                                        [
                                          "tiktok",
                                          "TikTok",
                                          "@brand or profile URL",
                                        ],
                                      ].map(([id, label, placeholder]) => (
                                        <label key={id} className="space-y-1.5">
                                          <span className="text-muted-foreground/50 text-[10px] font-semibold tracking-wider uppercase">
                                            {label}
                                          </span>
                                          <Input
                                            placeholder={placeholder}
                                            value={
                                              socials[
                                                id as keyof typeof socials
                                              ]
                                            }
                                            onChange={(e) =>
                                              setSocials({
                                                ...socials,
                                                [id]: e.target.value,
                                              })
                                            }
                                            className={inputClassName}
                                          />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {key === "brandGuidelines" && (
                                  <div className="space-y-5">
                                    <div>
                                      <span className="text-muted-foreground/50 font-mono text-[9px] font-bold tracking-widest uppercase">
                                        Guide structure
                                      </span>
                                      <p className="text-muted-foreground/45 mt-1 text-xs leading-relaxed">
                                        Choose how detailed the brand guide
                                        should be and which usage rules to
                                        include.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                      {[
                                        {
                                          value: "essential",
                                          label: "Essential",
                                          desc: "Colors, typography, and logo usage.",
                                        },
                                        {
                                          value: "complete",
                                          label: "Complete",
                                          desc: "Adds voice, spacing, accessibility, and examples.",
                                        },
                                      ].map((opt) => (
                                        <label
                                          key={opt.value}
                                          className="flex cursor-pointer items-start gap-3 border border-white/[0.06] bg-white/[0.01] p-3 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
                                        >
                                          <input
                                            type="radio"
                                            name="bg-depth"
                                            value={opt.value}
                                            checked={
                                              guidelines.depth === opt.value
                                            }
                                            onChange={() =>
                                              setGuidelines({
                                                ...guidelines,
                                                depth:
                                                  opt.value as typeof guidelines.depth,
                                              })
                                            }
                                            className="text-primary focus:ring-primary/40 mt-0.5 size-3.5 border-white/20 bg-black/50 focus:ring-offset-0"
                                          />
                                          <div>
                                            <p className="text-foreground/90 text-[11px] font-bold">
                                              {opt.label}
                                            </p>
                                            <p className="text-muted-foreground/40 mt-1 text-[10px] leading-relaxed">
                                              {opt.desc}
                                            </p>
                                          </div>
                                        </label>
                                      ))}
                                    </div>

                                    <label className="block space-y-1.5">
                                      <span className="text-muted-foreground/50 text-[10px] font-semibold tracking-wider uppercase">
                                        Tone of voice
                                      </span>
                                      <Input
                                        placeholder="e.g. confident, warm, technical, playful"
                                        value={guidelines.toneOfVoice}
                                        onChange={(e) =>
                                          setGuidelines({
                                            ...guidelines,
                                            toneOfVoice: e.target.value,
                                          })
                                        }
                                        className={inputClassName}
                                      />
                                    </label>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                      {[
                                        {
                                          key: "includeLogoRules",
                                          label: "Logo rules",
                                        },
                                        {
                                          key: "includeAccessibility",
                                          label: "Accessibility",
                                        },
                                        {
                                          key: "includeDoDonts",
                                          label: "Do / don'ts",
                                        },
                                      ].map((option) => (
                                        <label
                                          key={option.key}
                                          className="text-foreground/80 flex cursor-pointer items-center gap-2 border border-white/[0.06] bg-white/[0.01] px-3 py-2.5 text-xs font-medium transition-colors hover:border-white/[0.12] hover:bg-white/[0.03]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              guidelines[
                                                option.key as keyof typeof guidelines
                                              ] as boolean
                                            }
                                            onChange={(e) =>
                                              setGuidelines({
                                                ...guidelines,
                                                [option.key]: e.target.checked,
                                              })
                                            }
                                            className="text-primary focus:ring-primary/40 size-3.5 border-white/20 bg-black/50 focus:ring-offset-0"
                                          />
                                          {option.label}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {key === "businessCard" && (
                                  <div className="space-y-3">
                                    <span className="text-muted-foreground/40 font-mono text-[9px] font-bold tracking-widest uppercase">
                                      Contact Info
                                    </span>
                                    <div className="grid grid-cols-2 gap-2.5">
                                      <div className="col-span-2">
                                        <Input
                                          placeholder="Company Name"
                                          value={contact.companyName}
                                          onChange={(e) =>
                                            setContact({
                                              ...contact,
                                              companyName: e.target.value,
                                            })
                                          }
                                          className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                        />
                                      </div>
                                      <Input
                                        placeholder="Full Name"
                                        value={contact.name}
                                        onChange={(e) =>
                                          setContact({
                                            ...contact,
                                            name: e.target.value,
                                          })
                                        }
                                        className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                      />
                                      <Input
                                        placeholder="Job Title"
                                        value={contact.title}
                                        onChange={(e) =>
                                          setContact({
                                            ...contact,
                                            title: e.target.value,
                                          })
                                        }
                                        className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                      />
                                      <Input
                                        placeholder="Phone"
                                        value={contact.phone}
                                        onChange={(e) =>
                                          setContact({
                                            ...contact,
                                            phone: e.target.value,
                                          })
                                        }
                                        className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                      />
                                      <Input
                                        placeholder="Email"
                                        value={contact.email}
                                        onChange={(e) =>
                                          setContact({
                                            ...contact,
                                            email: e.target.value,
                                          })
                                        }
                                        className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                      />
                                      <div className="col-span-2">
                                        <Input
                                          placeholder="Address"
                                          value={contact.address}
                                          onChange={(e) =>
                                            setContact({
                                              ...contact,
                                              address: e.target.value,
                                            })
                                          }
                                          className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <Input
                                          placeholder="Website"
                                          value={contact.website}
                                          onChange={(e) =>
                                            setContact({
                                              ...contact,
                                              website: e.target.value,
                                            })
                                          }
                                          className="focus-visible:border-primary placeholder:text-muted-foreground/30 h-10 rounded-none !border-t-0 !border-r-0 border-b !border-l-0 border-white/[0.15] !bg-transparent px-2 text-xs shadow-none transition-colors hover:border-white/[0.3] focus-visible:ring-0"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {key === "brandPresentation" && (
                                  <div className="space-y-3">
                                    <span className="text-muted-foreground/40 font-mono text-[9px] font-bold tracking-widest uppercase">
                                      Product Images
                                    </span>
                                    <p className="text-muted-foreground/30 font-mono text-[10px]">
                                      Upload blank product images to apply your
                                      logo on.
                                    </p>
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files.length > 0
                                        ) {
                                          onMockupUpload(
                                            Array.from(e.target.files),
                                          );
                                        }
                                      }}
                                    />
                                    {mockupPreviews.length > 0 && (
                                      <div className="grid grid-cols-4 gap-2">
                                        {mockupPreviews.map((preview, pidx) => (
                                          <div
                                            key={pidx}
                                            className="group relative aspect-square overflow-hidden bg-zinc-900 ring-1 ring-white/[0.08]"
                                          >
                                            <img
                                              src={preview}
                                              alt={`Product ${pidx + 1}`}
                                              className="h-full w-full object-contain p-1.5"
                                            />
                                            <button
                                              onClick={() =>
                                                onMockupRemove?.(pidx)
                                              }
                                              className="absolute top-0.5 right-0.5 bg-black/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                                            >
                                              <XIcon className="size-2.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <button
                                      onClick={() =>
                                        fileInputRef.current?.click()
                                      }
                                      className="group text-muted-foreground/40 hover:border-primary/30 hover:text-primary flex w-full items-center justify-center gap-2 border border-dashed border-white/[0.08] py-2.5 font-mono text-[10px] tracking-wider uppercase transition-all"
                                    >
                                      <UploadIcon
                                        weight="bold"
                                        className="size-3.5 transition-transform group-hover:-translate-y-0.5"
                                      />
                                      Upload Images
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Context */}
              <div className="w-full space-y-3 border-t border-white/[0.04] pt-6">
                <Label className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Drop any final notes, specific icon requests, or extra context..."
                  className="text-foreground placeholder:text-muted-foreground/30 focus-visible:border-primary/45 focus-visible:ring-primary/20 min-h-[104px] resize-none border-white/[0.08] bg-zinc-950/70 p-4 text-sm"
                />
              </div>

              {/* Generate Footer */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setWorkspaceState("creative-direction")}
                  className="rounded-none font-mono text-xs tracking-wider uppercase"
                >
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back
                </Button>

                <div className="flex items-center gap-4">
                  {/* Credits */}
                  <div className="mr-2 flex flex-col items-end">
                    <span className="text-muted-foreground/40 font-mono text-[9px] font-bold tracking-widest uppercase">
                      Total Cost
                    </span>
                    <span className="text-foreground flex items-center gap-1.5 text-sm font-black tracking-tight tabular-nums">
                      {totalCredits} Credits
                    </span>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    size="lg"
                    className="group relative overflow-hidden rounded-none px-8 font-mono text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(var(--primary),0.15)] transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.3)]"
                  >
                    {/* Shimmer effect */}
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

                    {isGenerating ? (
                      <span className="relative z-10 flex items-center gap-2">
                        Generating <span className="animate-pulse">...</span>
                      </span>
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">
                        <SparkleIcon weight="fill" className="size-4" />
                        Generate Kit
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
