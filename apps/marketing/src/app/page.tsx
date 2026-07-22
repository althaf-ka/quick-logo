import { FeaturesSection } from "@/components/sections/features-section";
import { FaqSection } from "@/components/sections/faq-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { ShowcaseSection } from "@/components/sections/showcase-section";
import { WorkflowSection } from "@/components/sections/workflow-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <ShowcaseSection />
        <FeaturesSection />
        <WorkflowSection />
        <PricingSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </>
  );
}
