import { Label } from "@quicklogo/ui/components/label";
import { Input } from "@quicklogo/ui/components/input";
import type { ContactData } from "./utils";
import { SectionHeader } from "./section-header";

interface ContactSectionProps {
  contact: ContactData;
  contactHasData: boolean;
  getError: (field: keyof ContactData) => string | undefined;
  onUpdate: (field: keyof ContactData, value: string) => void;
}

const inputClassName =
  "h-10 rounded-none border-white/[0.08] bg-zinc-950/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-colors";
const errorClassName =
  "border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/20";

export function ContactSection({
  contact,
  contactHasData,
  getError,
  onUpdate,
}: ContactSectionProps) {
  const renderInput = (
    field: keyof ContactData,
    label: string,
    placeholder: string,
    isRequired: boolean = false,
    type: string = "text",
    className: string = "",
  ) => {
    const error = getError(field);
    const hasValue = contact[field].trim().length > 0;
    // Show error only if field has been interacted with (has value) but is invalid,
    // or if the whole section is trying to be valid but missing this required field.
    // For simplicity, we just check if there's an error.
    // To avoid red fields on initial empty load, we can conditionally apply aria-invalid only if value exists or if user tried to submit.
    // We'll apply it if error exists and field is not empty, to preserve original UX of not screaming red on empty.
    const isInvalid = !!error && hasValue;

    return (
      <div className={className}>
        <Label className="text-muted-foreground/50 mb-1.5 block text-[9px] tracking-wider uppercase">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </Label>
        <Input
          type={type}
          placeholder={placeholder}
          value={contact[field]}
          onChange={(e) => onUpdate(field, e.target.value)}
          className={`${inputClassName} ${isInvalid ? errorClassName : ""}`}
          aria-invalid={isInvalid ? "true" : "false"}
          aria-errormessage={isInvalid ? `${field}-error` : undefined}
        />
        {isInvalid && (
          <p
            id={`${field}-error`}
            className="mt-1.5 text-[9px] font-medium text-red-500"
          >
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Contact Details"
        isRequired={false}
        hasData={contactHasData}
        description="Add the details you may want to include, then choose exactly what appears in Business Card settings."
      />
      <div className="grid grid-cols-2 gap-3">
        {renderInput(
          "name",
          "Full Name",
          "e.g. Jane Doe",
          false,
          "text",
          "col-span-2",
        )}
        {renderInput(
          "title",
          "Job Title",
          "e.g. Founder & CEO",
          false,
          "text",
          "col-span-2",
        )}
        {renderInput("phone", "Phone", "+1 (555) 000-0000", false, "tel")}
        {renderInput("email", "Email", "hello@brand.com", false, "email")}
        {renderInput(
          "website",
          "Website",
          "www.brand.com",
          false,
          "text",
          "col-span-2",
        )}
        {renderInput(
          "address",
          "Physical Address",
          "123 Creative Ave, NY",
          false,
          "text",
          "col-span-2",
        )}
      </div>
    </div>
  );
}
