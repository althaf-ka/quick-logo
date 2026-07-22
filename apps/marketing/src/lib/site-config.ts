export const siteConfig = {
  name: "QuickLogo",
  description:
    "Create a distinctive logo and a complete, ready-to-use brand kit with AI.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173",
} as const;

export function getAppUrl(path = "/") {
  return new URL(path, siteConfig.appUrl).toString();
}
