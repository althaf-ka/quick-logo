import {
  InstagramLogoIcon,
  XLogoIcon,
  LinkedinLogoIcon,
  FacebookLogoIcon,
  YoutubeLogoIcon,
  TiktokLogoIcon,
} from "@phosphor-icons/react";
import type { SocialsData } from "./utils";
import { SectionHeader } from "./section-header";
import { SocialInput } from "./social-input";

interface SocialSectionProps {
  socials: SocialsData;
  socialsHasData: boolean;
  isSocialMediaRequired?: boolean;
  isBusinessCardRequired?: boolean;
  onUpdate: (platform: keyof SocialsData, value: string) => void;
  onBlur: (platform: keyof SocialsData, value: string) => void;
}

const SOCIAL_PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    icon: (
      <InstagramLogoIcon weight="duotone" className="size-3.5 text-pink-500" />
    ),
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: <XLogoIcon weight="duotone" className="size-3.5 text-blue-400" />,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: (
      <LinkedinLogoIcon weight="duotone" className="size-3.5 text-blue-500" />
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <FacebookLogoIcon weight="duotone" className="size-3.5 text-blue-500" />
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: (
      <YoutubeLogoIcon weight="duotone" className="size-3.5 text-red-500" />
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: (
      <TiktokLogoIcon weight="duotone" className="size-3.5 text-zinc-300" />
    ),
  },
] as const;

export function SocialSection({
  socials,
  socialsHasData,
  isSocialMediaRequired,
  isBusinessCardRequired,
  onUpdate,
  onBlur,
}: SocialSectionProps) {
  const isRequired = Boolean(isSocialMediaRequired);
  const requiredText = isSocialMediaRequired
    ? "Required for Social Media Kit"
    : undefined;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Social Handles"
        isRequired={isRequired}
        hasData={socialsHasData}
        requiredText={requiredText}
        description={`Paste a profile URL or username. We'll extract the exact handle${isBusinessCardRequired ? ", and you can choose which profiles appear in Business Card settings" : ""}.`}
      />
      <div className="flex flex-col gap-3">
        {SOCIAL_PLATFORMS.map(({ id, label, icon }) => (
          <SocialInput
            key={id}
            id={id}
            label={label}
            icon={icon}
            value={socials[id as keyof SocialsData]}
            onChange={(val) => onUpdate(id as keyof SocialsData, val)}
            onBlur={(val) => onBlur(id as keyof SocialsData, val)}
          />
        ))}
      </div>
    </div>
  );
}
