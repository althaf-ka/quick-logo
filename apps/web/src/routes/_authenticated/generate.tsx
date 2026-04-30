import { createFileRoute } from "@tanstack/react-router";
import { useGenerateForm } from "@/hooks/use-generate-form";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { GenerationDisplay } from "@/components/generate/generation-display";
import { GenerationSidebar } from "@/components/generate/generation-sidebar";
import { MobileControlsSheet } from "@/components/generate/mobile-controls-sheet";
import { PromptInput } from "@/components/global/prompt-input";

export const Route = createFileRoute("/_authenticated/generate")({
  component: GeneratePage,
  head: () => ({
    meta: [
      { title: "Generate Logo | QuickLogo" },
      {
        name: "description",
        content: "Use AI to generate professional logos instantly.",
      },
    ],
  }),
});

function GeneratePage() {
  const isMobile = useIsMobile();
  const {
    prompt,
    setPrompt,
    config,
    updateConfig,
    handleReferenceImage,
    status,
    results,
    error,
    creditCost,
    handleGenerate,
    handleRetry,
    isGenerating,
    mobileConfigOpen,
    setMobileConfigOpen,
  } = useGenerateForm();

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <GenerationDisplay
          status={status}
          results={results}
          imageCount={config.imageCount}
          error={error}
          onRetry={handleRetry}
          onSuggestionClick={setPrompt}
        />

        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          isLoading={isGenerating}
          credits={creditCost}
          showMagicPrompt
          magicPrompt={config.magicPrompt}
          onMagicPromptChange={(val) => updateConfig("magicPrompt", val)}
          brandName={config.brandName}
          onBrandNameChange={(val) => updateConfig("brandName", val)}
          showConfigTrigger={isMobile}
          onConfigTrigger={() => setMobileConfigOpen(true)}
        />
      </div>

      {!isMobile && (
        <GenerationSidebar
          config={config}
          onConfigChange={updateConfig}
          onReferenceImageChange={handleReferenceImage}
        />
      )}

      {isMobile && (
        <MobileControlsSheet
          open={mobileConfigOpen}
          onOpenChange={setMobileConfigOpen}
          config={config}
          onConfigChange={updateConfig}
          onReferenceImageChange={handleReferenceImage}
        />
      )}
    </div>
  );
}
