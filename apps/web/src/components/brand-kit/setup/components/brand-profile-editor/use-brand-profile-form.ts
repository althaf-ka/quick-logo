import { useState, useEffect, useCallback, useMemo } from "react";
import type { ContactData, SocialsData } from "./utils";
import { contactSchema, extractUsername } from "./utils";

interface UseBrandProfileFormProps {
  contact: ContactData;
  setContact: React.Dispatch<React.SetStateAction<ContactData>>;
  socials: SocialsData;
  setSocials: React.Dispatch<React.SetStateAction<SocialsData>>;
  isOpen: boolean;
}

export function useBrandProfileForm({
  contact,
  setContact,
  socials,
  setSocials,
  isOpen,
}: UseBrandProfileFormProps) {
  const [localContact, setLocalContact] = useState<ContactData>(contact);
  const [localSocials, setLocalSocials] = useState<SocialsData>(socials);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Sync from props on open transition directly during render to avoid cascading effect renders
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setLocalContact(contact);
      setLocalSocials(socials);
    }
  }

  // Sync to parent on debounce only when sheet is open
  useEffect(() => {
    if (!isOpen) return;

    const handler = setTimeout(() => {
      setContact(localContact);
      setSocials(localSocials);
    }, 400);

    return () => clearTimeout(handler);
  }, [localContact, localSocials, setContact, setSocials, isOpen]);

  const forceSync = useCallback(() => {
    setContact(localContact);
    setSocials(localSocials);
  }, [localContact, localSocials, setContact, setSocials]);

  const updateContactField = useCallback(
    (field: keyof ContactData, value: string) => {
      setLocalContact((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateSocialField = useCallback(
    (platform: keyof SocialsData, value: string) => {
      setLocalSocials((prev) => ({ ...prev, [platform]: value }));
    },
    [],
  );

  const handleSocialBlur = useCallback(
    (platform: keyof SocialsData, value: string) => {
      const username = extractUsername(value);
      setLocalSocials((prev) => ({ ...prev, [platform]: username }));
    },
    [],
  );

  const contactHasData = useMemo(
    () => contactSchema.safeParse(localContact).success,
    [localContact],
  );

  const socialsHasData = useMemo(
    () => Object.values(localSocials).some((v) => v.trim() !== ""),
    [localSocials],
  );

  // Memoize parsing result to show inline errors
  const contactValidation = useMemo(() => {
    return contactSchema.safeParse(localContact);
  }, [localContact]);

  const getContactError = useCallback(
    (field: keyof ContactData) => {
      if (contactValidation.success) return undefined;
      const error = contactValidation.error.format();
      const typedError = error as unknown as Record<
        string,
        { _errors?: string[] } | undefined
      >;
      return typedError[field as string]?._errors?.[0];
    },
    [contactValidation],
  );

  return {
    localContact,
    localSocials,
    updateContactField,
    updateSocialField,
    handleSocialBlur,
    forceSync,
    contactHasData,
    socialsHasData,
    getContactError,
  };
}
