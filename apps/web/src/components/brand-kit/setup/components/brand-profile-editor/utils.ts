import type { ContactData, SocialsData } from "@quicklogo/shared";
export { contactSchema, extractUsername } from "@quicklogo/shared";
export type { ContactData, SocialsData };

export interface BrandProfileEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactData;
  setContact: React.Dispatch<React.SetStateAction<ContactData>>;
  socials: SocialsData;
  setSocials: React.Dispatch<React.SetStateAction<SocialsData>>;
  isBusinessCardRequired?: boolean;
  isSocialMediaRequired?: boolean;
}
