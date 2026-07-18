import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeftIcon,
  CheckSquareIcon,
  CheckCircleIcon,
  SparkleIcon,
  UploadIcon,
  XIcon,
  ShapesIcon,
  ShareNetworkIcon,
  IdentificationCardIcon,
  AppWindowIcon,
  ImageIcon,
  PresentationChartIcon,
  BookOpenTextIcon,
  PaletteIcon,
  UserCircleIcon,
  ArrowRightIcon,
  TextTIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { cn, cva } from "@quicklogo/ui/lib/utils";

const cardVariants = cva(
  "group/card relative overflow-hidden transition-colors duration-200 mb-2 ring-1",
  {
    variants: {
      status: {
        default: "bg-white/[0.01] ring-white/[0.06] hover:ring-white/[0.1]",
        selected: "bg-primary/[0.03] ring-primary/25",
        error: "bg-red-500/[0.03] ring-red-500/40",
      },
    },
    defaultVariants: { status: "default" },
  },
);

const iconVariants = cva("shrink-0 transition-colors duration-200", {
  variants: {
    status: {
      default: "text-muted-foreground/40",
      selected: "text-primary",
      error: "text-red-500",
    },
  },
  defaultVariants: { status: "default" },
});

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest uppercase ring-1",
  {
    variants: {
      status: {
        default: "text-muted-foreground/40 bg-white/[0.03] ring-white/[0.08]",
        selected: "bg-primary/15 text-primary ring-primary/20",
        error: "bg-red-500/15 text-red-500 ring-red-500/20",
      },
    },
    defaultVariants: { status: "default" },
  },
);

const checkboxVariants = cva(
  "flex size-4 items-center justify-center transition-all duration-200",
  {
    variants: {
      status: {
        default: "text-white/[0.1] group-hover/card:text-white/[0.25]",
        selected: "text-primary",
        error: "text-red-500",
      },
    },
    defaultVariants: { status: "default" },
  },
);
import { Button } from "@quicklogo/ui/components/button";
import { Label } from "@quicklogo/ui/components/label";
import { Input } from "@quicklogo/ui/components/input";
import { Textarea } from "@quicklogo/ui/components/textarea";
import { toast } from "@quicklogo/ui/components/sonner";
import type { DeliverablesConfig } from "@/types/brand-kit";
import type { BusinessCardBrief, SocialMediaBrief } from "@quicklogo/shared";
import {
  BRAND_KIT_SECTION_COSTS,
  isValidBusinessCardQrUrl,
} from "@quicklogo/shared";
import { BrandProfileEditor } from "../components/brand-profile-editor";
import { BusinessCardSettings } from "../components/business-card-settings";

const DELIVERABLES_CONFIG = [
  {
    id: "logoVariations",
    label: "Logo Variations",
    desc: "Alternate layouts & lockups",
    cost: BRAND_KIT_SECTION_COSTS.logoVariations,
    icon: <ShapesIcon weight="duotone" className="size-4" />,
  },
  {
    id: "favicon",
    label: "Favicon & Icons",
    desc: "App icons & favicons",
    cost: BRAND_KIT_SECTION_COSTS.favicon,
    icon: <AppWindowIcon weight="duotone" className="size-4" />,
  },
  {
    id: "socialMedia",
    label: "Social Media Kit",
    desc: "Profile pics & covers",
    cost: BRAND_KIT_SECTION_COSTS.socialMedia,
    icon: <ShareNetworkIcon weight="duotone" className="size-4" />,
  },
  {
    id: "businessCard",
    label: "Business Card",
    desc: "Print-ready designs",
    cost: BRAND_KIT_SECTION_COSTS.businessCard,
    icon: <IdentificationCardIcon weight="duotone" className="size-4" />,
  },
  {
    id: "brandPresentation",
    label: "Brand Presentation",
    desc: "Full brand guidelines",
    cost: BRAND_KIT_SECTION_COSTS.brandPresentation,
    icon: <PresentationChartIcon weight="duotone" className="size-4" />,
  },
  {
    id: "brandGraphics",
    label: "Brand Graphics",
    desc: "Social post & story backgrounds",
    cost: BRAND_KIT_SECTION_COSTS.brandGraphics,
    icon: <ImageIcon weight="duotone" className="size-4" />,
  },
  {
    id: "brandGuidelines",
    label: "Brand Guidelines",
    desc: "Rules and PDF exports",
    cost: BRAND_KIT_SECTION_COSTS.brandGuidelines,
    icon: <BookOpenTextIcon weight="duotone" className="size-4" />,
  },
] as const;

const DELIVERABLES_WITH_SETTINGS: Array<keyof DeliverablesConfig> = [
  "businessCard",
  "socialMedia",
  "brandGuidelines",
  "brandPresentation",
];

const inputClassName =
  "h-10 rounded-none border-white/[0.08] bg-zinc-950/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20";

interface DeliverablesStepProps {
  deliverables: DeliverablesConfig;
  setDeliverables: React.Dispatch<React.SetStateAction<DeliverablesConfig>>;
  socials: {
    instagram: string;
    twitter: string;
    linkedin: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
  setSocials: React.Dispatch<
    React.SetStateAction<{
      instagram: string;
      twitter: string;
      linkedin: string;
      facebook: string;
      youtube: string;
      tiktok: string;
    }>
  >;
  contact: {
    name: string;
    title: string;
    suggestion: string;
    phone: string;
    email: string;
    address: string;
    website: string;
  };
  setContact: React.Dispatch<
    React.SetStateAction<{
      name: string;
      title: string;
      suggestion: string;
      phone: string;
      email: string;
      address: string;
      website: string;
    }>
  >;
  guidelines: {
    depth: "essential" | "complete";
  };
  setGuidelines: React.Dispatch<
    React.SetStateAction<{
      depth: "essential" | "complete";
    }>
  >;
  socialMediaBrief: SocialMediaBrief;
  setSocialMediaBrief: React.Dispatch<React.SetStateAction<SocialMediaBrief>>;
  businessCardBrief: BusinessCardBrief;
  setBusinessCardBrief: React.Dispatch<React.SetStateAction<BusinessCardBrief>>;
  brandPersonality: string;
  setBrandPersonality: (v: string) => void;
  additionalContext: string;
  setAdditionalContext: (v: string) => void;
  onMockupUpload: (files: File[]) => Promise<string[] | void> | void;
  totalCredits: number;
  isGenerating?: boolean;
  onBack: () => void;
  onGenerate: () => void;
}

export function DeliverablesStep({
  deliverables,
  setDeliverables,
  socials,
  setSocials,
  contact,
  setContact,
  guidelines,
  setGuidelines,
  socialMediaBrief,
  setSocialMediaBrief,
  businessCardBrief,
  setBusinessCardBrief,
  brandPersonality,
  setBrandPersonality,
  additionalContext,
  setAdditionalContext,
  onMockupUpload,
  totalCredits,
  isGenerating,
  onBack,
  onGenerate,
}: DeliverablesStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [activeAccordions, setActiveAccordions] = useState<string[]>([]);
  const [isBrandProfileOpen, setIsBrandProfileOpen] = useState(false);

  const [localMockupFiles, setLocalMockupFiles] = useState<File[]>([]);
  const [localMockupPreviews, setLocalMockupPreviews] = useState<string[]>([]);
  const [isUploadingMockups, setIsUploadingMockups] = useState(false);

  useEffect(() => {
    return () => {
      localMockupPreviews.forEach(URL.revokeObjectURL);
    };
  }, [localMockupPreviews]);

  const handleMockupUploadLocal = (files: File[]) => {
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setLocalMockupFiles((prev) => [...prev, ...files]);
    setLocalMockupPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleMockupRemoveLocal = (idx: number) => {
    URL.revokeObjectURL(localMockupPreviews[idx]);
    setLocalMockupFiles((prev) => prev.filter((_, i) => i !== idx));
    setLocalMockupPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeliverableToggle = (key: keyof DeliverablesConfig) => {
    setErrorKeys((prev) => {
      const next = new Set(prev);
      next.delete(key as string);
      return next;
    });
    const isCurrentlyEnabled = deliverables[key].enabled;
    setDeliverables((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !isCurrentlyEnabled,
      },
    }));

    if (!isCurrentlyEnabled && DELIVERABLES_WITH_SETTINGS.includes(key)) {
      setActiveAccordions((prev) =>
        prev.includes(key as string) ? prev : [...prev, key as string],
      );
    } else if (isCurrentlyEnabled) {
      setActiveAccordions((prev) => prev.filter((v) => v !== key));
    }
  };

  // Validation
  const socialHasData = Object.values(socials).some((v) => v.trim() !== "");
  const selectedContactHasData = businessCardBrief.includedContactFields.every(
    (field) => Boolean(contact[field]?.trim()),
  );
  const selectedSocialsHaveData =
    businessCardBrief.includedSocialPlatforms.every((platform) =>
      Boolean(socials[platform]?.trim()),
    );
  const qrHasData =
    !businessCardBrief.includeQr ||
    businessCardBrief.qrTarget === "vcard" ||
    (businessCardBrief.qrTarget === "website" && !!contact.website.trim()) ||
    (businessCardBrief.qrTarget === "custom" &&
      isValidBusinessCardQrUrl(businessCardBrief.customQrValue));
  const contactHasData =
    selectedContactHasData &&
    selectedSocialsHaveData &&
    (businessCardBrief.includedContactFields.length > 0 ||
      businessCardBrief.includedSocialPlatforms.length > 0) &&
    qrHasData;
  const contactError =
    errorKeys.has("businessCard") &&
    deliverables.businessCard.enabled &&
    !contactHasData;

  const presentationHasData = localMockupFiles.length > 0;
  const presentationError =
    errorKeys.has("brandPresentation") &&
    deliverables.brandPresentation.enabled &&
    !presentationHasData;

  const hasErrors =
    (deliverables.businessCard.enabled && !contactHasData) ||
    (deliverables.brandPresentation.enabled && !presentationHasData);

  return (
    <motion.div
      layout
      layoutId="section-deliverables"
      key="deliverables-active"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
      <div className="space-y-3">
        <Label className="text-foreground/50 text-[10px] font-bold tracking-widest uppercase">
          Included in Base Kit
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              title: "Core Logo Lockups",
              desc: "Primary, secondary, and mark-only.",
              icon: (
                <ShapesIcon
                  weight="duotone"
                  className="text-primary/80 size-4"
                />
              ),
            },
            {
              title: "Color Palette",
              desc: "Extracted hex codes & thematic colors.",
              icon: (
                <PaletteIcon
                  weight="duotone"
                  className="text-primary/80 size-4"
                />
              ),
            },
            {
              title: "Typography Rules",
              desc: "Font pairings and hierarchy setup.",
              icon: (
                <TextTIcon
                  weight="duotone"
                  className="text-primary/80 size-4"
                />
              ),
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 border border-white/[0.06] bg-white/[0.015] p-3"
            >
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div className="min-w-0">
                <h4 className="text-foreground/80 text-xs font-semibold">
                  {item.title}
                </h4>
                <p className="text-muted-foreground/45 mt-0.5 text-[10px] leading-tight">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deliverables Section */}
      <div className="space-y-3 border-t border-white/[0.04] pt-6">
        <Label className="text-foreground/50 text-[10px] font-bold tracking-widest uppercase">
          Add-Ons
        </Label>
        <div className="flex flex-col gap-3">
          {DELIVERABLES_CONFIG.map((item) => {
            const key = item.id as keyof DeliverablesConfig;
            const isSelected = deliverables[key].enabled;
            const hasSettings = DELIVERABLES_WITH_SETTINGS.includes(key);
            const isExpanded = activeAccordions.includes(key);

            const isError =
              (key === "businessCard" && contactError) ||
              (key === "brandPresentation" && presentationError);

            const status = isSelected
              ? isError
                ? "error"
                : "selected"
              : "default";

            return (
              <div key={item.id} className={cardVariants({ status })}>
                {isSelected ? (
                  <div
                    className={cn(
                      "absolute top-0 bottom-0 left-0 w-0.5",
                      isError ? "bg-red-500" : "bg-primary",
                    )}
                  />
                ) : null}
                {/* Card header — always visible */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => handleDeliverableToggle(key)}
                >
                  <div className={iconVariants({ status })}>{item.icon}</div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "flex items-center gap-2 text-[13px] leading-tight font-bold tracking-tight",
                        isSelected ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {item.label}
                      {isError ? (
                        <span className="font-mono text-[9px] tracking-wider text-red-500 uppercase">
                          {key === "brandPresentation"
                            ? "Needs Images"
                            : "Needs Info"}
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-muted-foreground/45 text-[10px] leading-snug">
                      {item.desc}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className={badgeVariants({ status })}>
                      {item.cost === 0 ? (
                        "Free"
                      ) : (
                        <>
                          <SparkleIcon weight="fill" className="size-2" />
                          {item.cost}
                        </>
                      )}
                    </span>
                    <div className={checkboxVariants({ status })}>
                      {isSelected ? (
                        <CheckSquareIcon weight="fill" className="size-4" />
                      ) : (
                        <div className="size-3.5 border-[1.5px] border-current" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Configure Button (Visible when selected) */}
                <AnimatePresence initial={false}>
                  {hasSettings && isSelected ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isExpanded) {
                            setActiveAccordions((prev) =>
                              prev.filter((v) => v !== key),
                            );
                          } else {
                            setActiveAccordions((prev) => [
                              ...prev,
                              key as string,
                            ]);
                          }
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between border-t px-4 py-2 font-mono text-[9px] tracking-widest uppercase transition-colors outline-none",
                          isError
                            ? "border-red-500/10 text-red-500/60 hover:text-red-500"
                            : "text-muted-foreground/50 hover:text-primary border-white/[0.04]",
                        )}
                      >
                        <span>Configure</span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CaretDownIcon className="size-3" />
                        </motion.div>
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Settings Content (Visible when expanded) */}
                <AnimatePresence initial={false}>
                  {hasSettings && isSelected && isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        {key === "brandGuidelines" ? (
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {[
                                {
                                  value: "essential",
                                  label: "Essential",
                                  desc: "Colors, typography, and logo usage.",
                                },
                                {
                                  value: "complete",
                                  label: "Complete",
                                  desc: "Adds voice, spacing, and accessibility.",
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
                                    checked={guidelines.depth === opt.value}
                                    onChange={() =>
                                      setGuidelines({
                                        depth: opt.value as
                                          | "essential"
                                          | "complete",
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
                          </div>
                        ) : null}
                        {key === "businessCard" ? (
                          <div className="pt-2">
                            <BusinessCardSettings
                              brief={businessCardBrief}
                              setBrief={setBusinessCardBrief}
                              contact={contact}
                              socials={socials}
                              showValidation={contactError}
                              onEditProfile={() => setIsBrandProfileOpen(true)}
                            />
                          </div>
                        ) : null}
                        {key === "socialMedia" ? (
                          <div className="flex flex-col gap-4 pt-2">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <label className="flex flex-col gap-1.5">
                                <span className="text-muted-foreground/60 font-mono text-[9px] tracking-widest uppercase">
                                  Purpose
                                </span>
                                <select
                                  value={socialMediaBrief.purpose}
                                  onChange={(event) =>
                                    setSocialMediaBrief((current) => ({
                                      ...current,
                                      purpose: event.target
                                        .value as SocialMediaBrief["purpose"],
                                    }))
                                  }
                                  className={inputClassName}
                                >
                                  <option value="brand-awareness">
                                    Brand awareness
                                  </option>
                                  <option value="product-promotion">
                                    Product promotion
                                  </option>
                                  <option value="launch">Launch</option>
                                  <option value="community">Community</option>
                                  <option value="personal-brand">
                                    Personal brand
                                  </option>
                                </select>
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <span className="text-muted-foreground/60 font-mono text-[9px] tracking-widest uppercase">
                                  Visual direction
                                </span>
                                <select
                                  value={socialMediaBrief.visualDirection}
                                  onChange={(event) =>
                                    setSocialMediaBrief((current) => ({
                                      ...current,
                                      visualDirection: event.target
                                        .value as SocialMediaBrief["visualDirection"],
                                    }))
                                  }
                                  className={inputClassName}
                                >
                                  <option value="auto">Choose for me</option>
                                  <option value="minimal">Minimal</option>
                                  <option value="editorial">Editorial</option>
                                  <option value="photographic">
                                    Photographic
                                  </option>
                                  <option value="geometric">Geometric</option>
                                  <option value="product-focused">
                                    Product focused
                                  </option>
                                </select>
                              </label>
                            </div>
                            <Input
                              value={socialMediaBrief.message || ""}
                              onChange={(event) =>
                                setSocialMediaBrief((current) => ({
                                  ...current,
                                  message: event.target.value,
                                }))
                              }
                              maxLength={64}
                              placeholder="Main message (optional — your tagline is used by default)"
                              className={inputClassName}
                            />
                            <Input
                              value={socialMediaBrief.callToAction || ""}
                              onChange={(event) =>
                                setSocialMediaBrief((current) => ({
                                  ...current,
                                  callToAction: event.target.value,
                                }))
                              }
                              maxLength={28}
                              placeholder="Call to action (optional)"
                              className={inputClassName}
                            />
                            <div className="flex flex-wrap gap-4 border-t border-white/[0.04] pt-3">
                              <label className="text-muted-foreground/70 flex cursor-pointer items-center gap-2 text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={socialMediaBrief.includeLogo}
                                  onChange={(event) =>
                                    setSocialMediaBrief((current) => ({
                                      ...current,
                                      includeLogo: event.target.checked,
                                    }))
                                  }
                                  className="accent-primary size-3.5"
                                />
                                Include original logo
                              </label>
                              <label className="text-muted-foreground/70 flex cursor-pointer items-center gap-2 text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={socialMediaBrief.includeTagline}
                                  onChange={(event) =>
                                    setSocialMediaBrief((current) => ({
                                      ...current,
                                      includeTagline: event.target.checked,
                                    }))
                                  }
                                  className="accent-primary size-3.5"
                                />
                                Include message
                              </label>
                            </div>
                            <p className="text-muted-foreground/45 text-[10px] leading-relaxed">
                              We’ll proofread your text and create a mobile-safe
                              YouTube banner with matching social covers. Your
                              logo and configured social handles can be included
                              automatically.
                            </p>
                          </div>
                        ) : null}
                        {key === "brandPresentation" ? (
                          <div className="space-y-3 pt-2">
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
                                  handleMockupUploadLocal(
                                    Array.from(e.target.files),
                                  );
                                }
                              }}
                            />
                            {localMockupPreviews.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {localMockupPreviews.map((preview, pidx) => (
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
                                        handleMockupRemoveLocal(pidx)
                                      }
                                      className="absolute top-0.5 right-0.5 bg-black/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                                    >
                                      <XIcon className="size-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="group text-muted-foreground/40 hover:border-primary/30 hover:text-primary flex w-full items-center justify-center gap-2 border border-dashed border-white/[0.08] py-2 font-mono text-[10px] tracking-wider uppercase transition-all"
                            >
                              <UploadIcon
                                weight="bold"
                                className="size-3.5 transition-transform group-hover:-translate-y-0.5"
                              />
                              Upload Images
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tell us more about your brand */}
      <div className="w-full space-y-5 border-t border-white/[0.04] pt-6">
        <div>
          <div className="text-foreground/90 text-[10px] font-bold tracking-widest uppercase select-text">
            Tell us more about your brand
          </div>
          <p className="text-muted-foreground/90 mt-1 text-[11px] leading-relaxed">
            The more context you give, the better your brand kit will be.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="text-foreground/80 text-[10px] font-semibold tracking-wider uppercase select-text">
            Brand Personality
          </div>
          <Input
            value={brandPersonality}
            onChange={(e) => setBrandPersonality(e.target.value)}
            placeholder="e.g. We're the friendly expert — approachable but authoritative"
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-foreground/80 text-[10px] font-semibold tracking-wider uppercase select-text">
            Anything Else?
          </div>
          <Textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Specific icon requests, color preferences, things to avoid... Or tell us more about your brand story and vision!"
            className="text-foreground placeholder:text-muted-foreground/25 focus-visible:border-primary/45 focus-visible:ring-primary/20 min-h-[80px] resize-none rounded-none border-white/[0.08] bg-zinc-950/70 p-3 text-xs"
          />
        </div>

        <motion.div
          initial={false}
          animate={
            deliverables.businessCard.enabled ||
            deliverables.socialMedia.enabled
              ? { height: "auto", opacity: 1, marginTop: 20 }
              : { height: 0, opacity: 0, marginTop: 0 }
          }
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="space-y-1.5 pt-4">
            <div className="text-muted-foreground/50 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase select-text">
              <span>Brand Profile & Socials</span>
              {(socialHasData || contactHasData) && (
                <span className="flex items-center gap-1 font-mono text-[8px] text-emerald-500">
                  <CheckCircleIcon weight="fill" className="size-3" />
                  Configured
                </span>
              )}
            </div>
            <button
              onClick={() => setIsBrandProfileOpen(true)}
              className={cn(
                "group hover:border-primary/40 hover:bg-primary/[0.03] relative flex w-full cursor-pointer items-center justify-between border border-white/[0.08] bg-white/[0.02] p-4 transition-all",
                contactError &&
                  !isBrandProfileOpen &&
                  "border-red-500/50 bg-red-500/[0.03] hover:border-red-500 hover:bg-red-500/[0.05]",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "group-hover:bg-primary/10 group-hover:ring-primary/20 flex size-8 items-center justify-center bg-white/[0.02] ring-1 ring-white/[0.06] transition-colors",
                    contactError &&
                      !isBrandProfileOpen &&
                      "bg-red-500/10 ring-red-500/30",
                  )}
                >
                  <UserCircleIcon
                    weight="duotone"
                    className={cn(
                      "text-muted-foreground/50 group-hover:text-primary size-4 transition-colors",
                      contactError && !isBrandProfileOpen && "text-red-500",
                    )}
                  />
                </div>
                <div className="text-left">
                  <p
                    className={cn(
                      "group-hover:text-primary font-mono text-[11px] font-bold tracking-widest uppercase transition-colors",
                      contactError && !isBrandProfileOpen
                        ? "text-red-500"
                        : "text-foreground/80",
                    )}
                  >
                    Edit Brand Profile
                  </p>
                  <p className="text-muted-foreground/40 mt-0.5 text-[10px] leading-snug">
                    Contact details & social media links
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-wider uppercase",
                    contactError
                      ? "font-bold text-red-500"
                      : "text-muted-foreground/50",
                  )}
                >
                  {contactError ? "Required" : "Optional profile details"}
                </span>
                <ArrowRightIcon
                  className={cn(
                    "text-muted-foreground/30 group-hover:text-primary size-4 transition-transform group-hover:translate-x-0.5",
                    contactError && !isBrandProfileOpen && "text-red-500",
                  )}
                />
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      <BrandProfileEditor
        isOpen={isBrandProfileOpen}
        onOpenChange={setIsBrandProfileOpen}
        contact={contact}
        setContact={setContact}
        socials={socials}
        setSocials={setSocials}
        isBusinessCardRequired={deliverables.businessCard.enabled}
        isSocialMediaRequired={false}
      />

      {/* Generate Footer */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 sm:flex-row">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="rounded-none font-mono text-xs tracking-wider uppercase"
        >
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <div className="mr-2 flex items-center gap-3 border border-white/[0.08] bg-white/[0.02] px-4 py-2 shadow-inner">
            <span className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-widest uppercase">
              Total
            </span>
            <div className="h-4 w-px bg-white/[0.1]" />
            <span className="text-foreground flex items-center gap-1.5 text-sm font-black tracking-tight tabular-nums">
              <SparkleIcon weight="fill" className="text-primary size-3.5" />
              {totalCredits}{" "}
              <span className="text-foreground/50 font-mono text-[9px] tracking-widest uppercase">
                Credits
              </span>
            </span>
          </div>

          <Button
            onClick={async () => {
              if (hasErrors) {
                const newErrors = new Set<string>();
                if (deliverables.businessCard.enabled && !contactHasData)
                  newErrors.add("businessCard");
                if (
                  deliverables.brandPresentation.enabled &&
                  !presentationHasData
                )
                  newErrors.add("brandPresentation");
                setErrorKeys(newErrors);

                if (newErrors.has("businessCard")) {
                  setActiveAccordions((current) =>
                    current.includes("businessCard")
                      ? current
                      : [...current, "businessCard"],
                  );
                }

                if (newErrors.has("socialMedia")) {
                  toast.error(
                    "Please fill in the required brand profile information.",
                  );
                } else if (newErrors.has("businessCard")) {
                  toast.error(
                    "Review the highlighted business-card settings before generating.",
                  );
                }

                return;
              }
              if (localMockupFiles.length > 0) {
                setIsUploadingMockups(true);
                await onMockupUpload(localMockupFiles);
                setIsUploadingMockups(false);
              }
              onGenerate();
            }}
            disabled={isGenerating || isUploadingMockups}
            size="lg"
            className={cn(
              "group relative overflow-hidden rounded-none px-8 font-mono text-xs tracking-wider uppercase transition-all",
              errorKeys.size > 0 && hasErrors
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                : "shadow-[0_0_20px_rgba(var(--primary),0.15)] hover:shadow-[0_0_30px_rgba(var(--primary),0.3)]",
            )}
          >
            {/* Shimmer effect */}
            {!(errorKeys.size > 0 && hasErrors) &&
            !isGenerating &&
            !isUploadingMockups ? (
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            ) : null}

            {isGenerating || isUploadingMockups ? (
              <span className="relative z-10 flex items-center gap-2">
                {isUploadingMockups ? "Uploading Assets" : "Generating Kit"}
                <span className="animate-pulse">...</span>
              </span>
            ) : errorKeys.size > 0 && hasErrors ? (
              <span className="relative z-10 flex items-center gap-2">
                Needs Info
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
  );
}
