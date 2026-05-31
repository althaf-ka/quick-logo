import { 
  ValidatedBrandContext, 
  ContactDetail, 
  BusinessCardContentStrategy, 
  NormalizedSocials, 
  NormalizedContact 
} from "./types";
import { formatSocialLabel, cleanOptionalText } from "./normalize-context";

export function selectPrimaryFrontDetail(context: ValidatedBrandContext): ContactDetail | undefined {
  if (!context.hasAnyDetails) return undefined;
  
  const industry = context.industry?.toLowerCase() || '';
  const isCreator = /creator|lifestyle|fashion|beauty|food|travel|art|music|entertainment|influencer|retail|hospitality/i.test(industry);
  const isB2B = /b2b|saas|enterprise|consulting|legal|finance|healthcare|education|professional/i.test(industry);
  
  const getSocial = (platform: keyof NormalizedSocials): ContactDetail | undefined => {
    if (context.socials[platform]) {
      return { type: "social", label: formatSocialLabel(platform), value: context.socials[platform]! };
    }
    return undefined;
  };
  const getContact = (key: keyof NormalizedContact): ContactDetail | undefined => {
    if (context.contact[key]) {
      return { type: key as ContactDetail["type"], label: key.charAt(0).toUpperCase() + key.slice(1), value: context.contact[key]! };
    }
    return undefined;
  };

  let primary: ContactDetail | undefined;

  if (isCreator) {
    primary = getSocial("instagram") || getSocial("tiktok") || getSocial("youtube") || getContact("website");
  } else if (isB2B) {
    primary = getContact("website") || getSocial("linkedin") || getContact("email");
  } else {
    primary = getSocial("instagram") || getContact("website") || getSocial("linkedin") || getSocial("tiktok") || getSocial("youtube") || getSocial("twitter");
  }
  
  return primary;
}

export function buildBusinessCardContentStrategy(context: ValidatedBrandContext): BusinessCardContentStrategy {
  const frontDetail = selectPrimaryFrontDetail(context);
  const backDetails: ContactDetail[] = [];

  for (const [k, v] of Object.entries(context.contact)) {
    if (v) backDetails.push({ type: k as ContactDetail["type"], label: k.charAt(0).toUpperCase() + k.slice(1), value: v as string });
  }
  for (const [k, v] of Object.entries(context.socials)) {
    if (v) backDetails.push({ type: "social", label: formatSocialLabel(k as keyof NormalizedSocials), value: v as string });
  }

  // Remove duplicated front detail from back if it's there
  const filteredBackDetails = backDetails.filter(d => !(frontDetail && d.type === frontDetail.type && d.value === frontDetail.value));

  return {
    tagline: cleanOptionalText(context.tagline),
    frontDetail,
    backDetails: filteredBackDetails,
  };
}
