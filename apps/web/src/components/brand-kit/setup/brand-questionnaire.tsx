import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";
import type { DeliverablesConfig, WorkspaceState } from "@/types/brand-kit";

// Step Components
import { FoundationStep } from "./steps/foundation-step";
import { CreativeDirectionStep } from "./steps/creative-direction-step";
import { DeliverablesStep } from "./steps/deliverables-step";

interface BrandQuestionnaireProps {
  workspaceState: WorkspaceState;
  setWorkspaceState: (state: WorkspaceState) => void;
  brandName: string;
  setBrandName: (v: string) => void;
  deliverables: DeliverablesConfig;
  setDeliverables: React.Dispatch<React.SetStateAction<DeliverablesConfig>>;
  typography: string;
  setTypography: (v: string) => void;
  onMockupUpload: (files: File[]) => Promise<string[] | void> | void;
  onGenerate: (prompt: string) => void;
  isGenerating?: boolean;
  totalCredits: number;
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
  onGenerate,
  isGenerating,
  totalCredits,
}: BrandQuestionnaireProps) {
  const [industry, setIndustry] = useState("");
  const [tagline, setTagline] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [brandPersonality, setBrandPersonality] = useState("");

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
    suggestion: "",
    phone: "",
    email: "",
    address: "",
    website: "",
  });

  const [guidelines, setGuidelines] = useState({
    depth: "essential" as "essential" | "complete",
  });

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
    if (brandPersonality.trim()) {
      prompt.push(`\nBrand Personality:\n${brandPersonality.trim()}`);
    }
    if (additionalContext.trim()) {
      prompt.push(`\nAdditional Instructions:\n${additionalContext.trim()}`);
    }

    if (deliverables.businessCard.enabled) {
      prompt.push(`\nBusiness Card Details:`);
      if (contact.name) prompt.push(`Name: ${contact.name}`);
      if (contact.title) prompt.push(`Title: ${contact.title}`);
      if (contact.suggestion)
        prompt.push(`Suggestion/Notes: ${contact.suggestion}`);
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
    }

    onGenerate(prompt.join("\n"));
  }, [
    brandName,
    tagline,
    industry,
    targetAudience,
    selectedVibes,
    typography,
    brandPersonality,
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

  const socialHasData = Object.values(socials).some((v) => v.trim() !== "");
  const socialError = deliverables.socialMedia.enabled && !socialHasData;

  const contactHasData = Object.values(contact).some((v) => v.trim() !== "");
  const contactError = deliverables.businessCard.enabled && !contactHasData;

  const canGenerate =
    canProceedToCreative &&
    canProceedToDeliverables &&
    !socialError &&
    !contactError;

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

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-start px-4 py-6 md:py-10">
      <div className="flex w-full max-w-2xl flex-col items-center space-y-8">
        <AnimatePresence mode="popLayout">
          {/* ========== FOUNDATION SECTION ========== */}
          {workspaceState === "foundation" ? (
            <FoundationStep
              brandName={brandName}
              setBrandName={setBrandName}
              industry={industry}
              setIndustry={setIndustry}
              tagline={tagline}
              setTagline={setTagline}
              targetAudience={targetAudience}
              setTargetAudience={setTargetAudience}
              onContinue={() => setWorkspaceState("creative-direction")}
            />
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
              <CreativeDirectionStep
                selectedVibes={selectedVibes}
                setSelectedVibes={setSelectedVibes}
                typography={typography}
                setTypography={setTypography}
                onBack={() => setWorkspaceState("foundation")}
                onContinue={() => setWorkspaceState("deliverables")}
              />
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
            <DeliverablesStep
              deliverables={deliverables}
              setDeliverables={setDeliverables}
              socials={socials}
              setSocials={setSocials}
              contact={contact}
              setContact={setContact}
              guidelines={guidelines}
              setGuidelines={setGuidelines}
              brandPersonality={brandPersonality}
              setBrandPersonality={setBrandPersonality}
              additionalContext={additionalContext}
              setAdditionalContext={setAdditionalContext}
              onMockupUpload={onMockupUpload}
              totalCredits={totalCredits}
              isGenerating={isGenerating}
              onBack={() => setWorkspaceState("creative-direction")}
              onGenerate={handleGenerate}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
