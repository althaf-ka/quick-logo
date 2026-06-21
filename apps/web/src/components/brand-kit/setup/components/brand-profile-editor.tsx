import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@quicklogo/ui/components/sheet";
import { CheckCircleIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { BrandProfileEditorProps } from "./brand-profile-editor/utils";
import { useBrandProfileForm } from "./brand-profile-editor/use-brand-profile-form";
import { ContactSection } from "./brand-profile-editor/contact-section";
import { SocialSection } from "./brand-profile-editor/social-section";

export function BrandProfileEditor({
  isOpen,
  onOpenChange,
  contact,
  setContact,
  socials,
  setSocials,
  isBusinessCardRequired,
  isSocialMediaRequired,
}: BrandProfileEditorProps) {
  const {
    localContact,
    localSocials,
    updateContactField,
    updateSocialField,
    handleSocialBlur,
    forceSync,
    contactHasData,
    socialsHasData,
    getContactError,
  } = useBrandProfileForm({
    contact,
    setContact,
    socials,
    setSocials,
    isOpen,
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-white/[0.08] bg-zinc-950 p-0 sm:w-[450px] sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/[0.06] p-6 text-left">
            <SheetTitle className="text-foreground/80 flex items-center gap-2 font-mono text-sm tracking-widest uppercase">
              <UserCircleIcon
                weight="duotone"
                className="text-primary size-5"
              />
              Brand Profile
            </SheetTitle>
            <SheetDescription className="text-muted-foreground/60 pt-2 text-xs leading-relaxed">
              Provide your contact info and social handles. We&apos;ll use these
              across all generated deliverables (like business cards and social
              banners).
            </SheetDescription>
          </SheetHeader>

          <div className="scrollbar-subtle flex-1 space-y-8 overflow-y-auto p-6">
            {isBusinessCardRequired && (
              <>
                <ContactSection
                  contact={localContact}
                  contactHasData={contactHasData}
                  getError={getContactError}
                  onUpdate={updateContactField}
                />
                <div className="h-px w-full bg-white/[0.04]" />
              </>
            )}

            <SocialSection
              socials={localSocials}
              socialsHasData={socialsHasData}
              isSocialMediaRequired={isSocialMediaRequired}
              isBusinessCardRequired={isBusinessCardRequired}
              onUpdate={updateSocialField}
              onBlur={handleSocialBlur}
            />

            <div className="pb-8" />
          </div>

          <div className="border-t border-white/[0.06] bg-zinc-950/80 p-4 backdrop-blur-md">
            <button
              onClick={() => {
                forceSync();
                onOpenChange(false);
              }}
              className="bg-primary/10 hover:bg-primary/20 text-primary ring-primary/20 flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] font-bold tracking-widest uppercase ring-1 transition-colors"
            >
              <CheckCircleIcon className="size-4" weight="fill" />
              Done Editing
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Re-export props interface for backward compatibility if needed by parent
export type { BrandProfileEditorProps };
