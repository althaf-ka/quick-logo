import * as fflate from "fflate";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import { toast } from "@quicklogo/ui/components/sonner";
import { createIcoFromPng } from "./image-utils";

async function fetchAsUint8Array(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

export async function generateBrandKitZip(
  data: BrandKitResultsData,
): Promise<Uint8Array> {
  const zipData: Record<string, Uint8Array> = {};

  const promises: Promise<void>[] = [];

  // Add Logo Variations
  if (data.logoVariations) {
    for (const v of data.logoVariations) {
      if (v.url) {
        promises.push(
          fetchAsUint8Array(v.url)
            .then((bytes) => {
              zipData[`logos/${v.id}.png`] = bytes;
            })
            .catch((e) => console.error("Failed to add logo variation:", e)),
        );
      }
    }
  }

  // Add Social Media
  if (data.socialMedia) {
    for (const s of data.socialMedia) {
      if (s.url) {
        promises.push(
          fetchAsUint8Array(s.url)
            .then((bytes) => {
              const filename = `${s.platform.toLowerCase()}-${s.type.toLowerCase().replace(/\s+/g, "-")}.png`;
              zipData[`social/${filename}`] = bytes;
            })
            .catch((e) => console.error("Failed to add social media:", e)),
        );
      }
    }
  }

  // Add Business Card
  if (data.businessCard) {
    if (data.businessCard.frontUrl) {
      promises.push(
        fetchAsUint8Array(data.businessCard.frontUrl)
          .then((bytes) => {
            zipData[`business-card/front.png`] = bytes;
          })
          .catch((e) => console.error("Failed to add business card front", e)),
      );
    }
    if (data.businessCard.backUrl) {
      promises.push(
        fetchAsUint8Array(data.businessCard.backUrl)
          .then((bytes) => {
            zipData[`business-card/back.png`] = bytes;
          })
          .catch((e) => console.error("Failed to add business card back", e)),
      );
    }
  }

  // Add Branded Backdrops
  if (data.brandedBackdrops) {
    if (data.brandedBackdrops.feedUrl) {
      promises.push(
        fetchAsUint8Array(data.brandedBackdrops.feedUrl)
          .then((bytes) => {
            zipData[`backdrops/feed.png`] = bytes;
          })
          .catch((e) => console.error("Failed to add backdrop feed", e)),
      );
    }
    if (data.brandedBackdrops.storyUrl) {
      promises.push(
        fetchAsUint8Array(data.brandedBackdrops.storyUrl)
          .then((bytes) => {
            zipData[`backdrops/story.png`] = bytes;
          })
          .catch((e) => console.error("Failed to add backdrop story", e)),
      );
    }
  }

  // Add Brand Presentation Image
  if (data.brandPresentation?.presentationUrl) {
    const isPlaceholder =
      data.brandPresentation.presentationUrl.includes("placehold.co");
    if (!isPlaceholder) {
      promises.push(
        fetchAsUint8Array(data.brandPresentation.presentationUrl)
          .then((bytes) => {
            zipData[`presentation/brand-presentation.png`] = bytes;
          })
          .catch((e) =>
            console.error("Failed to add brand presentation image to ZIP:", e),
          ),
      );
    }
  }

  // Add Favicons (resized on the fly)
  if (data.favicons) {
    const imgCache = new Map<string, Promise<HTMLImageElement>>();

    function getImg(url: string): Promise<HTMLImageElement> {
      if (!imgCache.has(url)) {
        imgCache.set(
          url,
          new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () =>
              reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
          }),
        );
      }
      return imgCache.get(url)!;
    }

    for (const f of data.favicons) {
      if (f.url) {
        promises.push(
          getImg(f.url)
            .then((img) => {
              return new Promise<Uint8Array>((resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = f.size;
                canvas.height = f.size;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("No ctx"));
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, f.size, f.size);
                canvas.toBlob((blob) => {
                  if (blob) {
                    blob
                      .arrayBuffer()
                      .then((ab) => resolve(new Uint8Array(ab)));
                  } else reject(new Error("No blob"));
                }, "image/png");
              });
            })
            .then((bytes) => {
              if (f.size === 16) {
                zipData[`favicons/favicon-16x16.png`] = bytes;
              } else if (f.size === 32) {
                zipData[`favicons/favicon-32x32.png`] = bytes;
                zipData[`favicons/favicon.ico`] = createIcoFromPng(
                  bytes,
                  32,
                  32,
                );
              } else if (f.size === 180) {
                zipData[`favicons/apple-touch-icon.png`] = bytes;
              } else if (f.size === 192) {
                zipData[`favicons/android-chrome-192x192.png`] = bytes;
              } else if (f.size === 512) {
                zipData[`favicons/android-chrome-512x512.png`] = bytes;
              } else {
                zipData[`favicons/favicon-${f.size}x${f.size}.png`] = bytes;
              }
            })
            .catch((e) =>
              console.error(`Failed to resize favicon ${f.size}`, e),
            ),
        );
      }
    }
  }

  const results = await Promise.allSettled(promises);

  const failedCount = results.filter((r) => r.status === "rejected").length;
  if (failedCount > 0) {
    console.warn(
      `[download-kit] ${failedCount} files failed to generate for the ZIP.`,
    );
    toast.warning(
      `${failedCount} assets could not be generated and will be missing from the ZIP.`,
    );
  }

  if (Object.keys(zipData).length === 0) {
    throw new Error("No files were successfully generated for the ZIP.");
  }

  return new Promise((resolve, reject) => {
    fflate.zip(zipData, (err, out) => {
      if (err) {
        reject(err);
      } else {
        resolve(out);
      }
    });
  });
}

export async function downloadBrandKit(data: BrandKitResultsData) {
  try {
    const zipBytes = await generateBrandKitZip(data);
    // TypeScript strict mode rejects ArrayBufferLike from fflate as a BlobPart, so the cast is necessary.
    const blob = new Blob([zipBytes as unknown as BlobPart], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.brandName?.replace(/\s+/g, "-").toLowerCase() || "brand"}-kit.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to generate zip:", err);
    toast.error(
      "There was an error generating your brand kit zip. Please try again.",
    );
  }
}
