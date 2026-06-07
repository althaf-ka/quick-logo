"use client";

import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
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
            className={cn("cursor-pointer", className)}
            {...props}
          />
        }
      />

      <DialogPortal>
        <DialogOverlay className="z-[100] bg-black/80" />

        <DialogContent
          showCloseButton={false}
          className="z-[100] flex flex-col items-center justify-center border-none bg-transparent p-4 shadow-none outline-none sm:p-12"
        >
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-none border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70"
              onClick={() =>
                downloadImage(
                  src,
                  `${alt?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "image"}.png`,
                )
              }
              title="Download Image"
            >
              <DownloadSimpleIcon className="size-5" />
              <span className="sr-only">Download</span>
            </Button>

            <DialogClose
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-none border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70"
                />
              }
            >
              <XIcon className="size-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="relative flex h-full w-full items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
