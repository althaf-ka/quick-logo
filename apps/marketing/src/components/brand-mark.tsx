import logo from "@quicklogo/assets/brand/logo-transparent.png";
import { cn } from "@quicklogo/ui/lib/utils";
import Image from "next/image";

interface BrandMarkProps {
  className?: string;
  priority?: boolean;
}

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src={logo}
      alt="QuickLogo"
      className={cn("h-8 w-auto object-contain", className)}
      priority={priority}
    />
  );
}
