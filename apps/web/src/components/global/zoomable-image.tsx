"use client";

import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@quicklogo/ui/components/dialog";
import { XIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { cn } from "@quicklogo/ui/lib/utils";
import { downloadImage } from "@/lib/download";

interface ZoomableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  disabled?: boolean;
}

export function ZoomableImage({
  disabled,
  className,
  src,
  alt,
  ...props
}: ZoomableImageProps) {
  if (disabled || !src || src.includes("placehold.co")) {
    return <img src={src} alt={alt} className={className} {...props} />;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <img
            src={src}
            alt={alt}
            className={cn(
              "cursor-zoom-in focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
              className,
            )}
            {...props}
          />
        }
      />

      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-[100] flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden overscroll-contain border-none bg-zinc-950/98 p-0 text-white shadow-none focus-visible:outline-1 focus-visible:outline-white/20 motion-reduce:animate-none sm:max-w-none rtl:translate-x-0"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 sm:px-6">
          <DialogTitle className="min-w-0 truncate text-sm font-medium text-white/90">
            {alt || "Image Preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen image preview
          </DialogDescription>

          <div className="pointer-events-auto flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-10 touch-manipulation rounded-none border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:border-white/30 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white/50"
              onClick={() =>
                void downloadImage(
                  src,
                  `${alt?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "image"}.png`,
                )
              }
              title="Download Image"
              aria-label="Download Image"
            >
              <DownloadSimpleIcon aria-hidden="true" className="size-5" />
            </Button>

            <DialogClose
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 touch-manipulation rounded-none border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:border-white/30 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Close Preview"
                />
              }
            >
              <XIcon aria-hidden="true" className="size-5" />
            </DialogClose>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="block size-full object-contain select-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
