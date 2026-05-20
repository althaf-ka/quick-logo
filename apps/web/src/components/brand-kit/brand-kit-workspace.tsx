import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { PromptInput } from "@/components/global/prompt-input";
import { BrandKitSidebar } from "@/components/brand-kit/brand-kit-sidebar";
import { BrandKitResults } from "@/components/brand-kit/brand-kit-results";
import { useBrandKit, getSectionLabel } from "@/hooks/use-brand-kit";
import { LoadingStatusIndicator } from "@/components/global/loading-status-indicator";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { downloadBrandKit } from "@/utils/download-kit";
import { SlidersHorizontalIcon, SparkleIcon } from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

interface BrandKitWorkspaceProps {
  imageId?: string;
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-subtle flex flex-1 flex-col items-center overflow-y-auto p-4 md:p-6">
          {bk.isGenerating ? (
            <GeneratingState />
          ) : bk.results ? (
            <BrandKitResults
              data={bk.results}
              onRefine={(sectionId) => bk.setTargetSection(sectionId)}
              onFontChange={bk.handleFontChange}
              onDownloadAll={() => {
                downloadBrandKit(bk.results!);
              }}
              refiningSectionId={bk.refiningSectionId}
            />
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
          isLoading={bk.isGenerating || !!bk.refiningSectionId}
          placeholder={promptPlaceholder}
          credits={bk.totalCredits}
          targetContext={
            bk.targetSection ? getSectionLabel(bk.targetSection) : undefined
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

function GeneratingState() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 py-6">
      <div className="flex flex-col items-center gap-4">
        <LoadingStatusIndicator label="Generating brand kit..." subtle />
        <p className="text-muted-foreground/40 font-mono text-[9px] tracking-wider">
          This may take a moment
        </p>
      </div>

      {/* Logo variations skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>

      {/* Color palette skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>

      {/* Typography skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    </div>
  );
}

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
            Configure your settings in the sidebar and describe your brand below
            to generate your kit.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="border-border/30 flex max-w-sm flex-col items-center gap-4 border border-dashed p-10 text-center">
        <div className="bg-muted/30 flex size-14 items-center justify-center">
          <SparkleIcon
            weight="duotone"
            className="text-muted-foreground/30 size-7"
          />
        </div>
        <div>
          <p className="font-mono text-sm font-black uppercase">
            Upload Your Logo
          </p>
          <p className="text-muted-foreground/60 mt-1 font-mono text-[10px] leading-relaxed tracking-wide">
            Upload a logo in the sidebar to get started, or select one from your
            existing projects.
          </p>
        </div>
      </div>
    </div>
  );
}
