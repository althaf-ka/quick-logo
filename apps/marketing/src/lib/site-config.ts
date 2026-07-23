import { APP_URL, SITE_URL } from "../config/urls";

export const siteConfig = {
  name: "QuickLogo",
  description:
    "Create a distinctive logo and a complete, ready-to-use brand kit with AI.",
  siteUrl: SITE_URL,
  appUrl: APP_URL,
} as const;

export function getAppUrl(path = "/") {
  return new URL(path, siteConfig.appUrl).toString();
}
