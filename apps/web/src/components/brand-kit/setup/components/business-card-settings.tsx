import { useState } from "react";
import {
  IdentificationCardIcon,
  LinkSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BUSINESS_CARD_CONTACT_FIELDS,
  BUSINESS_CARD_FORMATS,
  BUSINESS_CARD_ORIENTATIONS,
  BUSINESS_CARD_QR_TARGETS,
  BUSINESS_CARD_SOCIAL_PLATFORMS,
  BUSINESS_CARD_STYLES,
  SOCIAL_PLATFORM_LABELS,
  isValidBusinessCardQrUrl,
  type BusinessCardBrief,
  type BusinessCardContactField,
  type BusinessCardSocialPlatform,
} from "@quicklogo/shared";
import { Button } from "@quicklogo/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@quicklogo/ui/components/input-group";
import { Separator } from "@quicklogo/ui/components/separator";
import { Switch } from "@quicklogo/ui/components/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@quicklogo/ui/components/toggle-group";
import { cn } from "@quicklogo/ui/lib/utils";

const CONTACT_LABELS: Record<BusinessCardContactField, string> = {
  name: "Name",
  title: "Job title",
  phone: "Phone",
  email: "Email",
  website: "Website",
  address: "Address",
};

const OPTION_LABELS = {
  auto: "Choose for me",
  minimal: "Minimal",
  classic: "Classic",
  bold: "Bold",
  us: "US 3.5 × 2 in",
  eu: "EU 85 × 55 mm",
  landscape: "Landscape",
  portrait: "Portrait",
  website: "Open website",
  vcard: "Save contact",
  custom: "Custom URL",
} as const;

interface BusinessCardSettingsProps {
  brief: BusinessCardBrief;
  setBrief: React.Dispatch<React.SetStateAction<BusinessCardBrief>>;
  contact: Partial<Record<BusinessCardContactField, string>>;
  socials: Partial<Record<BusinessCardSocialPlatform, string>>;
  showValidation: boolean;
  onEditProfile: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
      {children}
    </span>
  );
}

export function BusinessCardSettings({
  brief,
  setBrief,
  contact,
  socials,
  showValidation,
  onEditProfile,
}: BusinessCardSettingsProps) {
  const [customQrTouched, setCustomQrTouched] = useState(false);
  const reduceMotion = useReducedMotion();

  const toggleContactField = (field: BusinessCardContactField) => {
    setBrief((current) => ({
      ...current,
      includedContactFields: current.includedContactFields.includes(field)
        ? current.includedContactFields.filter((item) => item !== field)
        : [...current.includedContactFields, field],
    }));
  };
  const toggleSocialPlatform = (platform: BusinessCardSocialPlatform) => {
    setBrief((current) => ({
      ...current,
      includedSocialPlatforms: current.includedSocialPlatforms.includes(
        platform,
      )
        ? current.includedSocialPlatforms.filter((item) => item !== platform)
        : [...current.includedSocialPlatforms, platform],
    }));
  };

  const missingContactFields = brief.includedContactFields.filter(
    (field) => !contact[field]?.trim(),
  );
  const missingSocialPlatforms = brief.includedSocialPlatforms.filter(
    (platform) => !socials[platform]?.trim(),
  );
  const hasSelectedContent =
    brief.includedContactFields.length > 0 ||
    brief.includedSocialPlatforms.length > 0;
  const websiteMissing =
    brief.includeQr && brief.qrTarget === "website" && !contact.website?.trim();
  const customQrValue = brief.customQrValue?.trim() || "";
  const customQrInvalid =
    brief.includeQr &&
    brief.qrTarget === "custom" &&
    customQrValue.length > 0 &&
    !isValidBusinessCardQrUrl(customQrValue);
  const customQrMissing =
    brief.includeQr &&
    brief.qrTarget === "custom" &&
    customQrValue.length === 0;
  const showCustomQrError =
    customQrInvalid || (customQrMissing && (customQrTouched || showValidation));

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col gap-2">
        <SectionLabel>Design Style</SectionLabel>
        <ToggleGroup
          aria-label="Design style"
          className="grid w-full grid-cols-2 sm:grid-cols-4"
          variant="outline"
        >
          {BUSINESS_CARD_STYLES.map((style) => (
            <ToggleGroupItem
              key={style}
              pressed={brief.style === style}
              onPressedChange={(pressed) => {
                if (pressed) setBrief((current) => ({ ...current, style }));
              }}
              className="text-[10px]"
            >
              {OPTION_LABELS[style]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SectionLabel>Card Format</SectionLabel>
          <ToggleGroup
            aria-label="Card format"
            className="grid w-full grid-cols-2"
            variant="outline"
          >
            {BUSINESS_CARD_FORMATS.map((format) => (
              <ToggleGroupItem
                key={format}
                pressed={brief.format === format}
                onPressedChange={(pressed) => {
                  if (pressed) setBrief((current) => ({ ...current, format }));
                }}
                className="text-[10px]"
              >
                {OPTION_LABELS[format]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <SectionLabel>Orientation</SectionLabel>
          <ToggleGroup
            aria-label="Card orientation"
            className="grid w-full grid-cols-2"
            variant="outline"
          >
            {BUSINESS_CARD_ORIENTATIONS.map((orientation) => (
              <ToggleGroupItem
                key={orientation}
                pressed={brief.orientation === orientation}
                onPressedChange={(pressed) => {
                  if (pressed) {
                    setBrief((current) => ({ ...current, orientation }));
                  }
                }}
                className="text-[10px]"
              >
                {OPTION_LABELS[orientation]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Contact Details</SectionLabel>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={onEditProfile}
            className="h-auto p-0 text-[10px]"
          >
            Manage Details
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_CARD_CONTACT_FIELDS.map((field) => {
            const value = contact[field]?.trim();
            const isSelected = brief.includedContactFields.includes(field);
            const isMissing = isSelected && !value;
            return (
              <label
                key={field}
                className={cn(
                  "bg-muted/10 border-border hover:bg-muted/20 flex min-h-12 cursor-pointer items-center justify-between gap-2 border px-3 py-2 transition-colors",
                  showValidation && isMissing && "border-destructive/50",
                )}
              >
                <span className="min-w-0">
                  <span className="text-foreground block text-[11px] font-medium">
                    {CONTACT_LABELS[field]}
                  </span>
                  {value || (showValidation && isMissing) ? (
                    <span
                      className={cn(
                        "text-muted-foreground block truncate text-[10px]",
                        showValidation && isMissing && "text-destructive",
                      )}
                    >
                      {value || "Required"}
                    </span>
                  ) : null}
                </span>
                <Switch
                  aria-label={`Include ${CONTACT_LABELS[field]}`}
                  aria-invalid={showValidation && isMissing}
                  size="sm"
                  checked={isSelected}
                  onCheckedChange={() => toggleContactField(field)}
                />
              </label>
            );
          })}
        </div>
        {showValidation && missingContactFields.length > 0 ? (
          <p
            role="alert"
            className="text-destructive flex items-center gap-1.5 text-[10px]"
          >
            <WarningCircleIcon aria-hidden="true" />
            Add{" "}
            {missingContactFields
              .map((field) => CONTACT_LABELS[field])
              .join(", ")}{" "}
            in Brand Profile before generating.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Social Profiles</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_CARD_SOCIAL_PLATFORMS.map((platform) => {
            const value = socials[platform]?.trim();
            const isSelected = brief.includedSocialPlatforms.includes(platform);
            const isMissing = isSelected && !value;
            return (
              <label
                key={platform}
                className={cn(
                  "bg-muted/10 border-border hover:bg-muted/20 flex min-h-12 cursor-pointer items-center justify-between gap-2 border px-3 py-2 transition-colors",
                  showValidation && isMissing && "border-destructive/50",
                )}
              >
                <span className="min-w-0">
                  <span className="text-foreground block text-[11px] font-medium">
                    {SOCIAL_PLATFORM_LABELS[platform]}
                  </span>
                  {value || (showValidation && isMissing) ? (
                    <span
                      className={cn(
                        "text-muted-foreground block truncate text-[10px]",
                        showValidation && isMissing && "text-destructive",
                      )}
                    >
                      {value || "Required"}
                    </span>
                  ) : null}
                </span>
                <Switch
                  aria-label={`Include ${SOCIAL_PLATFORM_LABELS[platform]}`}
                  aria-invalid={showValidation && isMissing}
                  size="sm"
                  checked={isSelected}
                  onCheckedChange={() => toggleSocialPlatform(platform)}
                />
              </label>
            );
          })}
        </div>
        {showValidation && missingSocialPlatforms.length > 0 ? (
          <p
            role="alert"
            className="text-destructive flex items-center gap-1.5 text-[10px]"
          >
            <WarningCircleIcon aria-hidden="true" />
            Add usernames for{" "}
            {missingSocialPlatforms
              .map((platform) => SOCIAL_PLATFORM_LABELS[platform])
              .join(", ")}{" "}
            in Brand Profile before generating.
          </p>
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-foreground text-[11px] font-medium">
            QR Code
          </span>
          <Switch
            aria-label="Add a scannable QR code"
            checked={brief.includeQr}
            onCheckedChange={(includeQr) =>
              setBrief((current) => ({ ...current, includeQr }))
            }
          />
        </label>

        <motion.div
          initial={false}
          animate={{
            gridTemplateRows: brief.includeQr ? "1fr" : "0fr",
            opacity: brief.includeQr ? 1 : 0,
          }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
          }
          className="grid"
          aria-hidden={!brief.includeQr}
        >
          <div className="min-h-0 overflow-hidden" inert={!brief.includeQr}>
            <div className="flex flex-col gap-3 pt-1">
              <ToggleGroup
                aria-label="QR code destination"
                className="grid w-full grid-cols-3"
                variant="outline"
              >
                {BUSINESS_CARD_QR_TARGETS.map((qrTarget) => (
                  <ToggleGroupItem
                    key={qrTarget}
                    pressed={brief.qrTarget === qrTarget}
                    onPressedChange={(pressed) => {
                      if (pressed) {
                        setBrief((current) => ({ ...current, qrTarget }));
                      }
                    }}
                    className="text-[10px]"
                  >
                    {OPTION_LABELS[qrTarget]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="relative h-16">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={brief.qrTarget}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: reduceMotion ? 0 : 0.14 }}
                    className="absolute inset-0"
                  >
                    {brief.qrTarget === "website" ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex h-10 items-center gap-2 border border-white/[0.08] bg-zinc-950/70 px-3">
                          <LinkSimpleIcon
                            aria-hidden="true"
                            className="text-muted-foreground size-4"
                          />
                          <span className="text-muted-foreground truncate text-[10px]">
                            {contact.website?.trim() ||
                              "Website from Brand Profile"}
                          </span>
                        </div>
                        {showValidation && websiteMissing ? (
                          <p
                            role="alert"
                            className="text-destructive text-[10px]"
                          >
                            Add a website or choose another destination.
                          </p>
                        ) : null}
                      </div>
                    ) : brief.qrTarget === "vcard" ? (
                      <div className="flex h-10 items-center gap-2 border border-white/[0.08] bg-zinc-950/70 px-3">
                        <IdentificationCardIcon
                          aria-hidden="true"
                          className="text-muted-foreground size-4"
                        />
                        <span className="text-muted-foreground truncate text-[10px]">
                          Creates a phone contact from the selected details
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <InputGroup
                          className={cn(
                            "has-[[data-slot=input-group-control]:focus-visible]:border-primary/50 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/20 h-10 border-white/[0.08] bg-zinc-950/70",
                            showCustomQrError && "border-destructive",
                          )}
                        >
                          <InputGroupAddon>
                            <InputGroupText>
                              <LinkSimpleIcon aria-hidden="true" />
                            </InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            aria-label="Custom QR code URL"
                            aria-invalid={showCustomQrError}
                            aria-describedby={
                              showCustomQrError ? "custom-qr-error" : undefined
                            }
                            autoComplete="off"
                            inputMode="url"
                            name="business-card-qr-url"
                            spellCheck={false}
                            type="url"
                            value={brief.customQrValue || ""}
                            onBlur={() => setCustomQrTouched(true)}
                            onChange={(event) =>
                              setBrief((current) => ({
                                ...current,
                                customQrValue: event.target.value,
                              }))
                            }
                            maxLength={500}
                            placeholder="e.g. https://example.com/booking…"
                            className="placeholder:text-muted-foreground/35"
                          />
                        </InputGroup>
                        <p
                          id="custom-qr-error"
                          aria-live="polite"
                          className={cn(
                            "text-muted-foreground min-h-3 text-[10px]",
                            showCustomQrError && "text-destructive",
                          )}
                        >
                          {showCustomQrError
                            ? "Enter a complete URL beginning with http:// or https://."
                            : null}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Creative Direction</SectionLabel>
        <InputGroup className="has-[[data-slot=input-group-control]:focus-visible]:border-primary/50 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/20 min-h-24 border-white/[0.08] bg-zinc-950/70">
          <InputGroupTextarea
            aria-label="Creative direction"
            autoComplete="off"
            name="business-card-creative-direction"
            value={brief.notes || ""}
            onChange={(event) =>
              setBrief((current) => ({ ...current, notes: event.target.value }))
            }
            maxLength={700}
            placeholder="e.g. Dark premium card, subtle metallic accents, confident editorial typography…"
            className="placeholder:text-muted-foreground/25 min-h-20"
          />
          <InputGroupAddon align="block-end">
            <InputGroupText className="ms-auto text-[10px] tabular-nums">
              {brief.notes?.length || 0}/700
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <p className="text-muted-foreground/60 text-[10px]">
          Anything else in mind? Add visual preferences, references, or ideas.
        </p>
      </div>

      {!hasSelectedContent && showValidation ? (
        <p
          role="alert"
          className="text-destructive flex items-center gap-1.5 text-[10px]"
        >
          <WarningCircleIcon aria-hidden="true" />
          Select at least one contact detail or configured social profile.
        </p>
      ) : null}
    </div>
  );
}
