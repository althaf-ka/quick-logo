import { SectionHeader, SectionContent } from "./section-header";

export interface SocialMediaAsset {
  platform: string;
  type: string;
  dimensions: string;
  url: string;
}

interface SocialMediaSectionProps {
  assets: SocialMediaAsset[];
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function SocialMediaSection({
  assets,
  onRefine,
  isRefining,
}: SocialMediaSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Social Media Kit"
        sectionId="social-media"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset, i) => (
            <div
              key={i}
              className="group hover:border-primary/30 border transition-colors"
            >
              <div className="bg-muted/20 flex items-center justify-center overflow-hidden">
                <img
                  src={asset.url}
                  alt={`${asset.platform} ${asset.type}`}
                  className="w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between border-t px-3 py-2">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase">
                    {asset.platform}
                  </p>
                  <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                    {asset.type}
                  </p>
                </div>
                <span className="text-muted-foreground/40 font-mono text-[8px]">
                  {asset.dimensions}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionContent>
    </div>
  );
}
