"use client";

import * as React from "react";
// @ts-ignore
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
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
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <img
          src={src}
          alt={alt}
          className={cn("cursor-pointer", className)}
          {...props}
        />
      </DialogPrimitive.Trigger>
      
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[100] bg-black/80 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-200" />
        
        <DialogPrimitive.Popup className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-12 outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-200">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-none shadow-lg h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-md"
              onClick={() => downloadImage(src, `${alt?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'image'}.png`)}
              title="Download Image"
            >
              <DownloadSimpleIcon className="size-5" />
              <span className="sr-only">Download</span>
            </Button>
            
            <DialogPrimitive.Close
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-none shadow-lg h-10 w-10 bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-md"
                />
              }
            >
              <XIcon className="size-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          
          <div className="relative flex h-full w-full items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
