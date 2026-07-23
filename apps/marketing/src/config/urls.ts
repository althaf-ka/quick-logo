const isDev = process.env.NODE_ENV === "development";

const rawSiteUrl = isDev
  ? "http://localhost:3000"
  : process.env.NEXT_PUBLIC_SITE_URL;

const rawAppUrl = isDev
  ? "http://localhost:5173"
  : process.env.NEXT_PUBLIC_APP_URL;

if (!rawSiteUrl || !rawAppUrl) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL must be configured for production",
  );
}

export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");
export const APP_URL = rawAppUrl.replace(/\/+$/, "");
