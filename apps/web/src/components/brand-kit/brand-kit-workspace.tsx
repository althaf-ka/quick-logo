import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { PromptInput } from "@/components/global/prompt-input";
import { BrandKitSidebar } from "@/components/brand-kit/brand-kit-sidebar";
import { useBrandKit, getSectionLabel } from "@/hooks/use-brand-kit";
import { SlidersHorizontalIcon, SparkleIcon } from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

interface BrandKitWorkspaceProps {
  /** For create mode — optional platform logo ID from search params */
  imageId?: string;
  /** For view mode — saved brand kit ID to fetch from DB */
  brandKitId?: string;
}

export function BrandKitWorkspace({
  imageId,
  brandKitId,
}: BrandKitWorkspaceProps) {
  const isMobile = useIsMobile();
  const bk = useBrandKit({ imageId, brandKitId });

  const promptPlaceholder = bk.targetSection
    ? `What would you like to change about the ${getSectionLabel(bk.targetSection).toLowerCase()}?`
    : "Describe your brand identity, target audience, or specific aesthetic preferences...";

  return (
    <div className="flex h-full">
      {/* Center Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-subtle flex flex-1 flex-col items-center overflow-y-auto p-4 md:p-6">
          {bk.results ? (
            // Phase 2: <BrandKitResults> will go here
            <div className="mx-auto w-full max-w-3xl">
              <p className="text-muted-foreground font-mono text-xs">
                Results will be displayed here after generation.
              </p>
            </div>
          ) : bk.logoUrl ? (
            <LogoReadyState />
          ) : (
            <EmptyState />
          )}
        </div>

        <PromptInput
          value={bk.prompt}
          onChange={bk.setPrompt}
          onSubmit={bk.handleGenerate}
          isLoading={bk.isGenerating}
          placeholder={promptPlaceholder}
          credits={bk.totalCredits}
          targetContext={
            bk.targetSection
              ? getSectionLabel(bk.targetSection)
              : undefined
          }
          onClearTarget={() => bk.setTargetSection(null)}
          {...(!bk.isFromPlatform && {
            brandName: bk.brandName,
            onBrandNameChange: bk.setBrandName,
          })}
          showConfigTrigger={isMobile}
          onConfigTrigger={() => bk.setSidebarOpen(true)}
          configIcon={
            <SlidersHorizontalIcon weight="bold" className="size-4" />
          }
        />
      </div>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <BrandKitSidebar
          logoUrl={bk.logoUrl}
          isLoadingLogo={bk.isLoadingLogo}
          onLogoUpload={bk.handleLogoUpload}
          onLogoRemove={bk.handleLogoRemove}
          isFromPlatform={bk.isFromPlatform}
          typography={bk.typography}
          setTypography={bk.setTypography}
          deliverables={bk.deliverables}
          setDeliverables={bk.setDeliverables}
          mockupImages={bk.mockupImages}
          setMockupImages={bk.setMockupImages}
          mockupPreviews={bk.mockupPreviews}
          extractedColors={bk.extractedColors}
        />
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer open={bk.sidebarOpen} onOpenChange={bk.setSidebarOpen}>
          <DrawerContent className="max-h-[85vh] px-0 pb-0">
            <DrawerHeader className="border-border/50 border-b px-4 pb-2 text-left">
              <DrawerTitle className="font-mono text-sm font-black tracking-widest uppercase">
                Brand Settings
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto p-0">
              <BrandKitSidebar
                logoUrl={bk.logoUrl}
                isLoadingLogo={bk.isLoadingLogo}
                onLogoUpload={bk.handleLogoUpload}
                onLogoRemove={bk.handleLogoRemove}
                isFromPlatform={bk.isFromPlatform}
                typography={bk.typography}
                setTypography={bk.setTypography}
                deliverables={bk.deliverables}
                setDeliverables={bk.setDeliverables}
                mockupImages={bk.mockupImages}
                setMockupImages={bk.setMockupImages}
                mockupPreviews={bk.mockupPreviews}
                extractedColors={bk.extractedColors}
                className="h-auto max-h-none w-full overflow-visible border-none"
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

/** Shown when a logo is uploaded but brand kit hasn't been generated yet */
function LogoReadyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="border-border/30 flex max-w-sm flex-col items-center gap-4 border border-dashed p-10 text-center">
        <div className="bg-primary/10 flex size-14 items-center justify-center">
          <SparkleIcon weight="duotone" className="text-primary size-7" />
        </div>
        <div>
          <p className="font-mono text-sm font-black uppercase">
            Ready to Create
          </p>
          <p className="text-muted-foreground/60 mt-1 font-mono text-[10px] leading-relaxed tracking-wide">
            Configure your settings in the sidebar and describe
            your brand below to generate your kit.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Shown when no logo has been uploaded yet */
function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="border-border/30 flex max-w-sm flex-col items-center gap-4 border border-dashed p-10 text-center">
        <div className="bg-muted/30 flex size-14 items-center justify-center">
          <SparkleIcon weight="duotone" className="text-muted-foreground/30 size-7" />
        </div>
        <div>
          <p className="font-mono text-sm font-black uppercase">
            Upload Your Logo
          </p>
          <p className="text-muted-foreground/60 mt-1 font-mono text-[10px] leading-relaxed tracking-wide">
            Upload a logo in the sidebar to get started, or select
            one from your existing projects.
          </p>
        </div>
      </div>
    </div>
  );
}
