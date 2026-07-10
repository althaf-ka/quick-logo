import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";
import type { DeliverablesConfig, WorkspaceState } from "@/types/brand-kit";

// Step Components
import { FoundationStep } from "./steps/foundation-step";
import { CreativeDirectionStep } from "./steps/creative-direction-step";
import { DeliverablesStep } from "./steps/deliverables-step";

import type {
  SocialMediaBrief,
  StructuredBrandContext,
} from "@quicklogo/shared";

const DEFAULT_SOCIAL_MEDIA_BRIEF: SocialMediaBrief = {
  purpose: "brand-awareness",
  visualDirection: "auto",
  includeLogo: true,
  includeTagline: true,
};

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
  onGenerate: (prompt?: string, context?: StructuredBrandContext) => void;
  isGenerating?: boolean;
  totalCredits: number;
  structuredContext: StructuredBrandContext;
  updateStructuredContext: (c: Partial<StructuredBrandContext>) => void;
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
  structuredContext,
  updateStructuredContext,
}: BrandQuestionnaireProps) {
  // Initialize local state from session (which handles hydration & drafts)
  const [industry, setIndustry] = useState(structuredContext.industry || "");
  const [tagline, setTagline] = useState(structuredContext.tagline || "");
  const [targetAudience, setTargetAudience] = useState(
    structuredContext.targetAudience || "",
  );
  const [selectedVibes, setSelectedVibes] = useState<string[]>(
    structuredContext.selectedVibes || [],
  );
  const [additionalContext, setAdditionalContext] = useState(
    structuredContext.additionalContext || "",
  );
  const [brandPersonality, setBrandPersonality] = useState(
    structuredContext.brandPersonality || "",
  );

  const [socials, setSocials] = useState({
    instagram: structuredContext.socials?.instagram || "",
    twitter: structuredContext.socials?.twitter || "",
    linkedin: structuredContext.socials?.linkedin || "",
    youtube: structuredContext.socials?.youtube || "",
    tiktok: structuredContext.socials?.tiktok || "",
  });

  const [contact, setContact] = useState({
    name: structuredContext.contact?.name || "",
    title: structuredContext.contact?.title || "",
    suggestion: structuredContext.contact?.suggestion || "",
    phone: structuredContext.contact?.phone || "",
    email: structuredContext.contact?.email || "",
    address: structuredContext.contact?.address || "",
    website: structuredContext.contact?.website || "",
  });

  const [guidelines, setGuidelines] = useState({
    depth:
      structuredContext.guidelines?.depth ||
      ("essential" as "essential" | "complete"),
  });
  const [socialMediaBrief, setSocialMediaBrief] = useState<SocialMediaBrief>(
    structuredContext.socialMediaBrief || DEFAULT_SOCIAL_MEDIA_BRIEF,
  );

  useEffect(() => {
    // Re-hydrate local state ONLY if an external hydration event occurred (e.g. loading a past brand kit)
    if (!structuredContext._hydratedAt) return;

    setIndustry(structuredContext.industry || "");
    setTagline(structuredContext.tagline || "");
    setTargetAudience(structuredContext.targetAudience || "");
    setSelectedVibes(structuredContext.selectedVibes || []);
    setAdditionalContext(structuredContext.additionalContext || "");
    setBrandPersonality(structuredContext.brandPersonality || "");

    if (structuredContext.socials) {
      setSocials((prev) => ({ ...prev, ...structuredContext.socials }));
    }
    if (structuredContext.contact) {
      setContact((prev) => ({ ...prev, ...structuredContext.contact }));
    }
    if (structuredContext.guidelines) {
      setGuidelines((prev) => ({
        ...prev,
        depth: structuredContext.guidelines?.depth || "essential",
      }));
    }
    if (structuredContext.socialMediaBrief) {
      setSocialMediaBrief(structuredContext.socialMediaBrief);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuredContext._hydratedAt]); // Only trigger when hydration timestamp changes

  const commitToSession = useCallback(() => {
    updateStructuredContext({
      industry,
      tagline,
      targetAudience,
      selectedVibes,
      additionalContext,
      brandPersonality,
      socials,
      contact,
      guidelines,
      socialMediaBrief,
    });
  }, [
    industry,
    tagline,
    targetAudience,
    selectedVibes,
    additionalContext,
    brandPersonality,
    socials,
    contact,
    guidelines,
    socialMediaBrief,
    updateStructuredContext,
  ]);

  // Keep partially entered questionnaire values recoverable on refresh. The
  // session owns the versioned localStorage write, so this component only
  // publishes its local form state after a short idle period.
  useEffect(() => {
    const timeout = window.setTimeout(commitToSession, 250);
    return () => window.clearTimeout(timeout);
  }, [commitToSession]);

  const handleGenerate = useCallback(() => {
    commitToSession();

    // Instead of stringifying the prompt, we pass the local context.
    // The flat string `prompt` will be derived server-side.
    onGenerate(undefined, {
      industry,
      tagline,
      targetAudience,
      selectedVibes,
      additionalContext,
      brandPersonality,
      socials,
      contact,
      guidelines,
      socialMediaBrief,
    });
  }, [
    commitToSession,
    onGenerate,
    industry,
    tagline,
    targetAudience,
    selectedVibes,
    additionalContext,
    brandPersonality,
    socials,
    contact,
    guidelines,
    socialMediaBrief,
  ]);

  const canProceedToCreative =
    brandName.trim().length > 0 &&
    industry.trim().length > 0 &&
    targetAudience.trim().length > 0;

  const canProceedToDeliverables =
    selectedVibes.length > 0 && typography !== "";

  const contactHasData = Object.values(contact).some((v) => v.trim() !== "");
  const contactError = deliverables.businessCard.enabled && !contactHasData;

  const canGenerate =
    canProceedToCreative && canProceedToDeliverables && !contactError;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (workspaceState === "foundation" && canProceedToCreative) {
          commitToSession();
          setWorkspaceState("creative-direction");
        } else if (
          workspaceState === "creative-direction" &&
          canProceedToDeliverables
        ) {
          commitToSession();
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
    commitToSession,
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
              onContinue={() => {
                commitToSession();
                setWorkspaceState("creative-direction");
              }}
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
                onContinue={() => {
                  commitToSession();
                  setWorkspaceState("deliverables");
                }}
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
          {workspaceState === "deliverables" ? (
            <DeliverablesStep
              deliverables={deliverables}
              setDeliverables={setDeliverables}
              socials={socials}
              setSocials={setSocials}
              contact={contact}
              setContact={setContact}
              guidelines={guidelines}
              setGuidelines={setGuidelines}
              socialMediaBrief={socialMediaBrief}
              setSocialMediaBrief={setSocialMediaBrief}
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
