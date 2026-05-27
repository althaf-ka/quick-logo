import { z } from "zod";

export interface ContactData {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  suggestion: string;
}

export interface SocialsData {
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
}

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

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Job title is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  address: z.string().min(1, "Address is required"),
  website: z.string().optional(),
});

export function extractUsername(input: string): string {
  if (!input) return "";
  let val = input.trim();

  // Remove trailing slashes
  if (val.endsWith("/")) val = val.slice(0, -1);

  // Normalize generic @handles if they just typed @username
  if (val.startsWith("@") && !val.includes("/")) {
    val = val.substring(1);
  }

  try {
    // Check if it's a URL-like string
    if (
      val.includes(".com") ||
      val.includes(".org") ||
      val.includes(".net") ||
      val.includes(".co") ||
      val.includes("t.me/") ||
      val.startsWith("http")
    ) {
      if (!val.startsWith("http")) val = "https://" + val;
      const url = new URL(val);
      
      // Explicit domain handling for common platforms
      const hostname = url.hostname.toLowerCase();
      
      // Strip query parameters for social URLs unless it's a specific youtube format
      if (hostname.includes("youtube.com")) {
        if (url.pathname === "/watch" || url.pathname === "/results") {
          return ""; // Invalid profile URL
        }
      }
      
      const parts = url.pathname.split("/").filter(Boolean);
      
      // Filter out internal routing prefixes
      const cleanParts = parts.filter(
        (p) => !["in", "company", "c", "user", "channel", "p"].includes(p)
      );
      
      let handle = cleanParts[cleanParts.length - 1] || "";
      if (handle.startsWith("@")) {
        handle = handle.substring(1);
      }
      
      return handle;
    }
    
    return val;
  } catch {
    // If URL parsing fails, just return the sanitized string
    return val.startsWith("@") ? val.substring(1) : val;
  }
}
