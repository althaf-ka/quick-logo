import { SectionHeader, SectionContent } from "./section-header";

export interface BusinessCardData {
  frontUrl: string;
  backUrl?: string;
}

interface BusinessCardSectionProps {
  card: BusinessCardData;
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function BusinessCardSection({
  card,
  onRefine,
  isRefining,
}: BusinessCardSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Business Card"
        sectionId="business-card"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="group border transition-colors hover:border-primary/30">
            <div className="bg-muted/10 overflow-hidden">
              <img
                src={card.frontUrl}
                alt="Business Card — Front"
                className="aspect-[1.75/1] w-full object-cover transition-transform group-hover:scale-[1.01]"
              />
            </div>
            <div className="border-t px-3 py-2">
              <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                Front
              </span>
            </div>
          </div>

          {card.backUrl && (
            <div className="group border transition-colors hover:border-primary/30">
              <div className="bg-muted/10 overflow-hidden">
                <img
                  src={card.backUrl}
                  alt="Business Card — Back"
                  className="aspect-[1.75/1] w-full object-cover transition-transform group-hover:scale-[1.01]"
                />
              </div>
              <div className="border-t px-3 py-2">
                <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  Back
                </span>
              </div>
            </div>
          )}
        </div>
      </SectionContent>
    </div>
  );
}
